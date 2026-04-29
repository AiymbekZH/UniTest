import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/auth/auth_repository.dart';
import '../../core/router/app_router.dart';
import '../../core/widgets/chunky_button.dart';

/// Sets a new password using a one-time reset token. The token comes from
/// the email link the user clicked, opened either as:
///   - `https://unitest.page/reset-password/<token>` — the web URL falls
///     through to the website (existing flow), or
///   - `unitest://reset?token=<token>` — our custom scheme; deep-links
///     into this page on the device. Configured in Phase 1.
class ResetPasswordPage extends ConsumerStatefulWidget {
  const ResetPasswordPage({super.key, required this.token});

  /// Reset token from the email URL. Backend hashes it and matches against
  /// `passwordResetTokenHash` (1-hour TTL).
  final String token;

  @override
  ConsumerState<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends ConsumerState<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _newPwd = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;
  bool _show = false;
  String? _error;

  @override
  void dispose() {
    _newPwd.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.resetPassword(
        token: widget.token,
        newPassword: _newPwd.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(
          content: Text('Пароль изменён. Войдите снова.'),
        ));
      context.go(AppRoute.login);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Сброс пароля')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Введите новый пароль',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ссылка действует 1 час с момента отправки.',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.errorContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            _error!,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onErrorContainer,
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _newPwd,
                      obscureText: !_show,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: 'Новый пароль',
                        suffixIcon: IconButton(
                          icon: Icon(_show
                              ? Icons.visibility_off_rounded
                              : Icons.visibility_rounded),
                          onPressed: () => setState(() => _show = !_show),
                        ),
                      ),
                      validator: (v) {
                        if (v == null || v.isEmpty) return 'Введите пароль';
                        if (v.length < 6) return 'Минимум 6 символов';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _confirm,
                      obscureText: !_show,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration:
                          const InputDecoration(labelText: 'Подтверждение'),
                      validator: (v) =>
                          v != _newPwd.text ? 'Пароли не совпадают' : null,
                    ),
                    const SizedBox(height: 24),
                    ChunkyButton(
                      label: 'Установить пароль',
                      icon: Icons.check_rounded,
                      fullWidth: true,
                      loading: _saving,
                      onPressed: _saving ? null : _submit,
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go(AppRoute.login),
                      child: const Text('Я вспомнил пароль'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
