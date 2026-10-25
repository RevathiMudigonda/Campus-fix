/// App-wide configuration.
///
/// The API base URL is public (the website already ships it), so it is safe to
/// keep a default here. No passwords, tokens or keys belong in this file.
///
/// Override it at run time without editing code, e.g. to test against a
/// backend running on your computer from the Android emulator:
///
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api
class AppConfig {
  const AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://campusfix-backend-z08g.onrender.com/api',
  );

  /// Render's free tier can need up to ~60 s to wake up after being idle.
  static const Duration requestTimeout = Duration(seconds: 60);
}
