import 'package:flutter/material.dart';

import '../models/auth_session.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/cf_widgets.dart';

/// Role-aware sign-in, mirroring the website's "Student / Admin" portals but
/// authenticating against the real backend (POST /api/auth/login).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.notice});

  /// Optional message shown on arrival (e.g. "session expired").
  final String? notice;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _username = TextEditingController();
  final TextEditingController _password = TextEditingController();

  String _portal = 'student'; // 'student' | 'admin'
  bool _hidePassword = true;
  bool _loading = false;
  String? _error;

  bool get _adminPortal => _portal == 'admin';

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    final NavigatorState navigator = Navigator.of(context);
    try {
      final AuthSession session = await ApiService.instance.login(
        _username.text.trim(),
        _password.text,
      );

      // The selected portal must match the account's real role.
      if (session.isAdmin != _adminPortal) {
        ApiService.instance.signOut();
        if (!mounted) return;
        setState(() {
          _error = session.isAdmin
              ? 'This is an admin account. Choose "Admin / Staff" above.'
              : 'This is a student account. Choose "Student" above.';
        });
        return;
      }

      if (!mounted) return;
      navigator.pushReplacementNamed('/issues');
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const _Brand(),
                    const SizedBox(height: 28),
                    if (widget.notice != null) ...<Widget>[
                      _Banner(text: widget.notice!, error: false),
                      const SizedBox(height: 12),
                    ],
                    CfCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          Text(
                            _adminPortal ? 'ADMIN PORTAL' : 'STUDENT PORTAL',
                            style: const TextStyle(
                              color: CfColors.muted,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _adminPortal ? 'Admin sign in' : 'Student sign in',
                            style: const TextStyle(
                              color: CfColors.heading,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 16),
                          SegmentedButton<String>(
                            segments: const <ButtonSegment<String>>[
                              ButtonSegment<String>(
                                value: 'student',
                                label: Text('Student'),
                                icon: Icon(Icons.school_outlined),
                              ),
                              ButtonSegment<String>(
                                value: 'admin',
                                label: Text('Admin / Staff'),
                                icon: Icon(Icons.shield_outlined),
                              ),
                            ],
                            selected: <String>{_portal},
                            onSelectionChanged: _loading
                                ? null
                                : (Set<String> picked) => setState(() {
                                      _portal = picked.first;
                                      _error = null;
                                    }),
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _username,
                            enabled: !_loading,
                            autocorrect: false,
                            enableSuggestions: false,
                            textInputAction: TextInputAction.next,
                            decoration: cfInputDecoration('Username'),
                            validator: (String? value) =>
                                (value == null || value.trim().isEmpty)
                                    ? 'Enter your username'
                                    : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _password,
                            enabled: !_loading,
                            obscureText: _hidePassword,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => _submit(),
                            decoration: cfInputDecoration(
                              'Password',
                              suffix: IconButton(
                                tooltip: _hidePassword
                                    ? 'Show password'
                                    : 'Hide password',
                                icon: Icon(
                                  _hidePassword
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined,
                                ),
                                onPressed: () => setState(
                                  () => _hidePassword = !_hidePassword,
                                ),
                              ),
                            ),
                            validator: (String? value) =>
                                (value == null || value.isEmpty)
                                    ? 'Enter your password'
                                    : null,
                          ),
                          if (_error != null) ...<Widget>[
                            const SizedBox(height: 12),
                            _Banner(text: _error!, error: true),
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                            style: cfPrimaryButtonStyle(),
                            onPressed: _loading ? null : _submit,
                            child: _loading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Sign in'),
                          ),
                          if (_loading) ...<Widget>[
                            const SizedBox(height: 10),
                            const Text(
                              'The first sign-in can take up to a minute '
                              'while the server wakes up.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: CfColors.muted,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ],
                      ),
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

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: CfColors.navy,
            borderRadius: BorderRadius.circular(18),
          ),
          child: const Icon(Icons.build_circle_outlined,
              color: Colors.white, size: 34),
        ),
        const SizedBox(height: 14),
        const Text(
          'CampusFix',
          style: TextStyle(
            color: CfColors.heading,
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Campus Issue Portal',
          style: TextStyle(color: CfColors.muted, fontSize: 14),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.error});

  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: error ? CfColors.dangerBg : CfColors.blueBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: error ? CfColors.danger : CfColors.border,
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: error ? CfColors.criticalFg : CfColors.blue,
          fontSize: 13,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
