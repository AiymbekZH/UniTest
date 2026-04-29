import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exceptions.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/chunky_button.dart';
import 'models/profile_models.dart';
import 'profile_controllers.dart';
import 'profile_repository.dart';
import 'widgets/cover_backdrop.dart';

/// Edit screen for the *own* profile. Mirrors the Account + Appearance
/// tabs from the React `<Profile>` page combined into one mobile form.
///
/// Required fields: firstName, lastName.
/// Validated fields: username (3-20 chars, [a-z0-9_]).
/// Bio max 400, headline max 120 (server-side enforced).
class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstName;
  late TextEditingController _lastName;
  late TextEditingController _middleName;
  late TextEditingController _username;
  late TextEditingController _headline;
  late TextEditingController _bio;
  String _coverPreset = 'aurora';
  String _language = 'ru';
  bool _saving = false;
  bool _initialized = false;

  Timer? _usernameDebounce;
  _UsernameStatus _usernameStatus = _UsernameStatus.idle;
  String? _usernameMessage;
  String? _initialUsername;

  @override
  void initState() {
    super.initState();
    _firstName = TextEditingController();
    _lastName = TextEditingController();
    _middleName = TextEditingController();
    _username = TextEditingController();
    _headline = TextEditingController();
    _bio = TextEditingController();
  }

  @override
  void dispose() {
    _usernameDebounce?.cancel();
    _firstName.dispose();
    _lastName.dispose();
    _middleName.dispose();
    _username.dispose();
    _headline.dispose();
    _bio.dispose();
    super.dispose();
  }

  void _initializeFromUser(ProfileUser u) {
    if (_initialized) return;
    _initialized = true;
    _firstName.text = u.firstName;
    _lastName.text = u.lastName;
    _middleName.text = u.middleName;
    _username.text = u.username ?? '';
    _initialUsername = u.username;
    _headline.text = u.headline;
    _bio.text = u.bio;
    _coverPreset = CoverBackdrop.validPresets.contains(u.coverPreset)
        ? u.coverPreset
        : 'aurora';
    _language = u.language ?? 'ru';
  }

  void _onUsernameChanged(String value) {
    _usernameDebounce?.cancel();
    final cleaned = value.trim().toLowerCase();

    if (cleaned.isEmpty || cleaned == (_initialUsername ?? '')) {
      setState(() {
        _usernameStatus = _UsernameStatus.idle;
        _usernameMessage = null;
      });
      return;
    }
    if (!RegExp(r'^[a-z0-9_]{3,20}$').hasMatch(cleaned)) {
      setState(() {
        _usernameStatus = _UsernameStatus.invalid;
        _usernameMessage = '3–20 символов: латиница, цифры, _';
      });
      return;
    }
    setState(() {
      _usernameStatus = _UsernameStatus.checking;
      _usernameMessage = 'Проверяем…';
    });

    _usernameDebounce = Timer(const Duration(milliseconds: 400), () async {
      try {
        final repo = ref.read(profileRepositoryProvider);
        final result = await repo.checkUsername(cleaned);
        if (!mounted) return;
        setState(() {
          if (result.available) {
            _usernameStatus = _UsernameStatus.available;
            _usernameMessage = 'Свободно';
          } else {
            _usernameStatus = _UsernameStatus.taken;
            _usernameMessage = result.reason ?? 'Уже занят';
          }
        });
      } catch (_) {
        if (!mounted) return;
        setState(() {
          _usernameStatus = _UsernameStatus.idle;
          _usernameMessage = null;
        });
      }
    });
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_usernameStatus == _UsernameStatus.checking ||
        _usernameStatus == _UsernameStatus.taken ||
        _usernameStatus == _UsernameStatus.invalid) {
      _toast('Исправьте никнейм перед сохранением.');
      return;
    }
    setState(() => _saving = true);
    try {
      final cleanedUsername = _username.text.trim().toLowerCase();
      await ref.read(myProfileProvider.notifier).save(
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            middleName: _middleName.text.trim(),
            username: cleanedUsername.isEmpty ? null : cleanedUsername,
            headline: _headline.text.trim(),
            bio: _bio.text.trim(),
            coverPreset: _coverPreset,
            language: _language,
          );
      if (!mounted) return;
      _toast('Профиль обновлён');
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final asyncProfile = ref.watch(myProfileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Редактировать профиль')),
      body: asyncProfile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(err is ApiException ? err.message : '$err'),
          ),
        ),
        data: (profile) {
          _initializeFromUser(profile.user);
          return _buildForm(context);
        },
      ),
    );
  }

  Widget _buildForm(BuildContext context) {
    final theme = Theme.of(context);
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          _SectionLabel('Имя'),
          const SizedBox(height: 8),
          _Field(
            controller: _firstName,
            hint: 'Имя',
            maxLength: 60,
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Имя обязательно' : null,
          ),
          const SizedBox(height: 12),
          _Field(
            controller: _lastName,
            hint: 'Фамилия',
            maxLength: 60,
            validator: (v) => (v == null || v.trim().isEmpty)
                ? 'Фамилия обязательна'
                : null,
          ),
          const SizedBox(height: 12),
          _Field(
            controller: _middleName,
            hint: 'Отчество (если есть)',
            maxLength: 60,
          ),
          const SizedBox(height: 24),
          _SectionLabel('Никнейм'),
          const SizedBox(height: 8),
          _Field(
            controller: _username,
            hint: 'andez_2026',
            prefix: '@',
            maxLength: 20,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9_]')),
            ],
            onChanged: _onUsernameChanged,
            helperText: _usernameMessage,
            helperColor: switch (_usernameStatus) {
              _UsernameStatus.available => AppColors.success600,
              _UsernameStatus.taken ||
              _UsernameStatus.invalid =>
                AppColors.danger500,
              _ => null,
            },
          ),
          const SizedBox(height: 24),
          _SectionLabel('О себе'),
          const SizedBox(height: 8),
          _Field(
            controller: _headline,
            hint: 'Краткое описание (заголовок)',
            maxLength: 120,
          ),
          const SizedBox(height: 12),
          _Field(
            controller: _bio,
            hint: 'Расскажите о себе',
            maxLength: 400,
            minLines: 3,
            maxLines: 6,
          ),
          const SizedBox(height: 24),
          _SectionLabel('Фон обложки'),
          const SizedBox(height: 4),
          Text(
            'Используется когда у вас нет загруженной обложки.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          _PresetPicker(
            value: _coverPreset,
            onChanged: (v) => setState(() => _coverPreset = v),
          ),
          const SizedBox(height: 24),
          _SectionLabel('Язык'),
          const SizedBox(height: 8),
          _LanguagePicker(
            value: _language,
            onChanged: (v) => setState(() => _language = v),
          ),
          const SizedBox(height: 32),
          ChunkyButton(
            label: 'Сохранить',
            icon: Icons.check_rounded,
            fullWidth: true,
            loading: _saving,
            onPressed: _saving ? null : _save,
          ),
        ],
      ),
    );
  }
}

enum _UsernameStatus { idle, checking, available, taken, invalid }

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      text.toUpperCase(),
      style: theme.textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w900,
        letterSpacing: 1.4,
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.hint,
    this.prefix,
    this.maxLength,
    this.minLines,
    this.maxLines = 1,
    this.validator,
    this.inputFormatters,
    this.onChanged,
    this.helperText,
    this.helperColor,
  });

  final TextEditingController controller;
  final String hint;
  final String? prefix;
  final int? maxLength;
  final int? minLines;
  final int maxLines;
  final FormFieldValidator<String>? validator;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;
  final String? helperText;
  final Color? helperColor;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      onChanged: onChanged,
      inputFormatters: inputFormatters,
      maxLength: maxLength,
      minLines: minLines,
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        prefixText: prefix,
        helperText: helperText,
        helperStyle: helperColor != null ? TextStyle(color: helperColor) : null,
        counterText: '',
      ),
    );
  }
}

class _PresetPicker extends StatelessWidget {
  const _PresetPicker({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final borderColor = isDark ? Colors.white : AppColors.textLightPrimary;
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        for (final preset in CoverBackdrop.validPresets)
          GestureDetector(
            onTap: () => onChanged(preset),
            child: Container(
              width: 80,
              height: 60,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: preset == value
                      ? theme.colorScheme.primary
                      : borderColor.withValues(alpha: 0.3),
                  width: preset == value ? 3 : 1.5,
                ),
              ),
              clipBehavior: Clip.hardEdge,
              child: Stack(
                children: [
                  Positioned.fill(child: CoverBackdrop(preset: preset)),
                  Positioned(
                    left: 6,
                    bottom: 4,
                    child: Text(
                      _label(preset),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 10,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                  if (preset == value)
                    const Positioned(
                      right: 4,
                      top: 4,
                      child: Icon(
                        Icons.check_circle_rounded,
                        color: AppColors.primary600,
                        size: 16,
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  String _label(String preset) => switch (preset) {
        'aurora' => 'Аврора',
        'mesh' => 'Мэш',
        'wave' => 'Волна',
        'grid' => 'Сетка',
        _ => preset,
      };
}

class _LanguagePicker extends StatelessWidget {
  const _LanguagePicker({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final options = const [
      ('ru', 'Русский'),
      ('kz', 'Қазақша'),
      ('en', 'English'),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final opt in options)
          ChoiceChip(
            label: Text(opt.$2),
            selected: value == opt.$1,
            onSelected: (_) => onChanged(opt.$1),
          ),
      ],
    );
  }
}
