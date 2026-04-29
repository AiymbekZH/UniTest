import 'dart:developer' as developer;
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/token_storage.dart';
import 'api_endpoints.dart';
import 'api_exceptions.dart';

/// Singleton Dio instance configured for the UniTest backend.
///
/// Responsibilities:
/// 1. Inject `Authorization: Bearer <jwt>` from secure storage on every
///    request that doesn't already carry one.
/// 2. Translate `DioException` into typed `ApiException` so feature code
///    never imports dio directly.
/// 3. On 401, clear the stored token and let auth state controller
///    decide the redirect (sign-in screen). We DON'T redirect here —
///    that's the router's job.
class DioClient {
  DioClient(this._tokenStorage)
      : dio = Dio(
          BaseOptions(
            baseUrl: ApiEndpoints.baseUrl,
            connectTimeout: const Duration(seconds: 12),
            sendTimeout: const Duration(seconds: 30),
            receiveTimeout: const Duration(seconds: 30),
            headers: const {
              'Accept': 'application/json',
            },
            // We treat 4xx/5xx as exceptions in `_translateError`. Setting
            // validateStatus = (_) => true would force every caller to
            // check status manually, which is error-prone.
          ),
        ) {
    dio.interceptors.add(_AuthInterceptor(_tokenStorage));
    dio.interceptors.add(_ErrorTranslatingInterceptor());
    // Verbose logging in debug builds only — wiped from release builds
    // by the dart compiler since `kDebugMode` is a const. Logs go through
    // `dart:developer.log` so they show up nicely in `flutter run` and
    // in DevTools' Network tab.
    if (kDebugMode) {
      dio.interceptors.add(_PrettyLogInterceptor());
    }
  }

  final Dio dio;
  final TokenStorage _tokenStorage;

  /// Convenience getter when callers only need the underlying client.
  Dio get raw => dio;
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._tokenStorage);

  final TokenStorage _tokenStorage;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (!options.headers.containsKey('Authorization')) {
      final token = await _tokenStorage.read();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Drop the token on hard 401 so the router redirects to /login the
    // next time auth state is read. We don't trigger navigation here
    // because interceptors have no BuildContext.
    if (err.response?.statusCode == 401) {
      await _tokenStorage.clear();
    }
    handler.next(err);
  }
}

class _ErrorTranslatingInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final translated = _translate(err);
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        response: err.response,
        type: err.type,
        error: translated,
        stackTrace: err.stackTrace,
        message: translated.message,
      ),
    );
  }

  ApiException _translate(DioException err) {
    final response = err.response;
    final status = response?.statusCode;
    final serverMessage = _extractMessage(response?.data);

    if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError) {
      return NetworkException(
        serverMessage ?? 'Нет соединения с сервером. Проверьте интернет.',
      );
    }

    if (status == null) {
      return UnknownApiException(serverMessage ?? 'Неизвестная ошибка');
    }

    switch (status) {
      case 400:
        return BadRequestException(serverMessage ?? 'Некорректный запрос');
      case 401:
        return UnauthorizedException(serverMessage ?? 'Авторизация требуется');
      case 403:
        return ForbiddenException(
          serverMessage ?? 'Доступ запрещён',
          reason: _extractReason(response?.data),
        );
      case 404:
        return NotFoundException(serverMessage ?? 'Не найдено');
      case 429:
        return TooManyRequestsException(
          serverMessage ?? 'Слишком много запросов. Попробуйте позже.',
        );
      default:
        if (status >= 500) {
          return ServerException(
            serverMessage ?? 'Ошибка сервера. Попробуйте позже.',
            statusCode: status,
          );
        }
        return UnknownApiException(
          serverMessage ?? 'Ошибка $status',
          statusCode: status,
        );
    }
  }

  String? _extractMessage(Object? data) {
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    if (data is String && data.isNotEmpty) return data;
    return null;
  }

  String? _extractReason(Object? data) {
    if (data is Map && data['reason'] is String) {
      return data['reason'] as String;
    }
    return null;
  }
}

/// Concise, human-readable HTTP logger that's only attached in debug
/// mode. Output format:
///
///     → POST /api/auth/login
///       body: {"email":"…","password":"…"}
///     ← 200 OK   /api/auth/login   312 ms
///       body: {"token":"eyJ…","user":{…}}
///
/// Tokens and passwords are redacted so screenshots of the console
/// never leak secrets. Body output is truncated at 1 KB so giant
/// responses (test lists with 100 questions) don't drown the console.
class _PrettyLogInterceptor extends Interceptor {
  static const int _bodyLimit = 1024;
  static const _redactedFields = {'password', 'token'};

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.extra['_startedAt'] = DateTime.now();
    final method = options.method.toUpperCase();
    final url = '${options.baseUrl}${options.path}';
    _log('→ $method $url');
    final body = options.data;
    if (body != null) _log('  body: ${_redactBody(body)}');
    handler.next(options);
  }

  @override
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    final ms = _elapsed(response.requestOptions);
    final method = response.requestOptions.method.toUpperCase();
    final url = response.requestOptions.uri.path;
    _log('← ${response.statusCode} $method $url   ${ms}ms');
    final body = response.data;
    if (body != null) _log('  body: ${_redactBody(body)}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final ms = _elapsed(err.requestOptions);
    final method = err.requestOptions.method.toUpperCase();
    final url = err.requestOptions.uri.toString();
    final status = err.response?.statusCode;
    _log('⚠ ${status ?? err.type.name} $method $url   ${ms}ms');
    if (err.response?.data != null) {
      _log('  error body: ${_redactBody(err.response?.data)}');
    } else if (err.message != null) {
      _log('  error: ${err.message}');
    }
    if (err.error is SocketException) {
      _log('  (network down? wrong host? device offline?)');
    }
    handler.next(err);
  }

  int _elapsed(RequestOptions options) {
    final started = options.extra['_startedAt'];
    if (started is DateTime) {
      return DateTime.now().difference(started).inMilliseconds;
    }
    return 0;
  }

  /// Redacts sensitive fields and trims long bodies. Accepts maps,
  /// strings, or arbitrary objects.
  String _redactBody(Object? body) {
    Object? data = body;
    if (data is Map) {
      final clone = <String, dynamic>{};
      data.forEach((k, v) {
        final key = k.toString();
        if (_redactedFields.contains(key.toLowerCase())) {
          clone[key] = '***';
        } else {
          clone[key] = v;
        }
      });
      data = clone;
    }
    final str = data.toString();
    if (str.length <= _bodyLimit) return str;
    return '${str.substring(0, _bodyLimit)}… (${str.length - _bodyLimit} more bytes)';
  }

  void _log(String msg) {
    developer.log(msg, name: 'http');
  }
}

/// Provider for the configured `DioClient`. Use via:
/// ```dart
/// final dio = ref.read(dioClientProvider).dio;
/// ```
final dioClientProvider = Provider<DioClient>((ref) {
  final tokenStorage = ref.read(tokenStorageProvider);
  return DioClient(tokenStorage);
});
