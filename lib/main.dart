import 'package:flutter/material.dart';

import 'models/auth_session.dart';
import 'screens/issues_screen.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'theme.dart';

void main() => runApp(const CampusFixApp());

class CampusFixApp extends StatelessWidget {
  const CampusFixApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CampusFix',
      theme: buildCampusFixTheme(),
      initialRoute: '/login',
      onGenerateRoute: (RouteSettings settings) {
        switch (settings.name) {
          case '/issues':
            final AuthSession? session = ApiService.instance.session;
            // No session (e.g. app restarted) means the user must sign in.
            if (session == null) {
              return MaterialPageRoute<void>(
                builder: (_) => const LoginScreen(),
              );
            }
            return MaterialPageRoute<void>(
              builder: (_) => IssuesScreen(session: session),
            );
          case '/login':
          default:
            final Object? arguments = settings.arguments;
            return MaterialPageRoute<void>(
              builder: (_) => LoginScreen(
                notice: arguments is String ? arguments : null,
              ),
            );
        }
      },
    );
  }
}
