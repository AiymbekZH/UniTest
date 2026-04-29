import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/widgets/chunky_button.dart';
import 'profile_controllers.dart';

/// Password change form. Backend `PUT /api/profile/password` requires
/// the current password to verify, then sets the new one (`>= 6` chars).
class ChangePasswordPage extends ConsumerStatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  ConsumerState<ChangePasswordPage> createState() =>
      _ChangePasswordPageState();
}

class _ChangePasswordPageState extends ConsumerState<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _current = TextEditingController();
  final _newPwd = TextEditingController();
  final _confirm = TextEditingController();
  bool _saving = false;
  bool _showCurrent = false;
  bool _showNew = false;

  @override
  void dispose() {
    _current.dispose();
    _newPwd.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    try {
      await ref.read(myProfileProvider.notifier).changePassword(
            currentPassword: _current.text,
            newPassword: _newPwd.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Пароль изменён')));
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Сменить пароль')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          children: [
            Text(
              'Введите текущий пароль и новый. Новый должен содержать минимум 6 символов.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _current,
              obscureText: !_showCurrent,
              autofillHints: const [AutofillHints.password],
              decoration: InputDecoration(
                labelText: 'Текущий пароль',
                suffixIcon: IconButton(
                  icon: Icon(_showCurrent
                      ? Icons.visibility_off_rounded
                      : Icons.visibility_rounded),
                  onPressed: () =>
                      setState(() => _showCurrent = !_showCurrent),
                ),
              ),
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Введите текущий пароль' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _newPwd,
              obscureText: !_showNew,
              autofillHints: const [AutofillHints.newPassword],
              decoration: InputDecoration(
                labelText: 'Новый пароль',
                suffixIcon: IconButton(
                  icon: Icon(_showNew
                      ? Icons.visibility_off_rounded
                      : Icons.visibility_rounded),
                  onPressed: () => setState(() => _showNew = !_showNew),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Введите новый пароль';
                if (v.length < 6) return 'Минимум 6 символов';
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirm,
              obscureText: !_showNew,
              autofillHints: const [AutofillHints.newPassword],
              decoration: const InputDecoration(
                labelText: 'Подтвердите пароль',
              ),
              validator: (v) {
                if (v != _newPwd.text) return 'Пароли не совпадают';
                return null;
              },
            ),
            const SizedBox(height: 32),
            ChunkyButton(
              label: 'Сохранить',
              icon: Icons.lock_outline_rounded,
              fullWidth: true,
              loading: _saving,
              onPressed: _saving ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}
