import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the JWT in OS-level secure storage:
/// - iOS: Keychain
/// - Android: EncryptedSharedPreferences (AES-256-GCM)
///
/// Why secure storage instead of `SharedPreferences`? The web client
/// stores its JWT in an httpOnly cookie that JavaScript can't read,
/// which protects it from XSS. On mobile we don't have that option,
/// but Keychain / EncryptedSharedPreferences are still significantly
/// safer than plain prefs (which any rooted device or backup can lift).
class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
              ),
            );

  static const String _tokenKey = 'unitest_jwt_token';

  final FlutterSecureStorage _storage;

  Future<String?> read() => _storage.read(key: _tokenKey);

  Future<void> write(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> clear() => _storage.delete(key: _tokenKey);
}

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage();
});
