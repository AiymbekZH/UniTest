/// Lightweight wrapper around DioException so feature code never imports
/// `package:dio/dio.dart`. UI layers can pattern-match on these classes
/// without leaking transport concerns.
sealed class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// 400 — typically validation or business-rule errors.
class BadRequestException extends ApiException {
  const BadRequestException(super.message, {super.statusCode = 400});
}

/// 401 — token missing / expired / invalid.
class UnauthorizedException extends ApiException {
  const UnauthorizedException(super.message, {super.statusCode = 401});
}

/// 403 — authenticated but not allowed (banned, missing permission).
class ForbiddenException extends ApiException {
  const ForbiddenException(
    super.message, {
    super.statusCode = 403,
    this.reason,
  });

  /// Optional structured reason returned by the backend (e.g. ban reason).
  final String? reason;
}

/// 404.
class NotFoundException extends ApiException {
  const NotFoundException(super.message, {super.statusCode = 404});
}

/// 429 — rate-limited or login lockout.
class TooManyRequestsException extends ApiException {
  const TooManyRequestsException(super.message, {super.statusCode = 429});
}

/// 5xx — server-side problem; retryable.
class ServerException extends ApiException {
  const ServerException(super.message, {super.statusCode});
}

/// Connection / timeout / no internet — also retryable.
class NetworkException extends ApiException {
  const NetworkException(super.message);
}

/// Anything else.
class UnknownApiException extends ApiException {
  const UnknownApiException(super.message, {super.statusCode});
}
