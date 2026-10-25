/// Result of a successful login. Kept in memory only (never written to disk),
/// so closing the app signs the user out.
class AuthSession {
  const AuthSession({
    required this.token,
    required this.username,
    required this.role,
  });

  final String token;
  final String username;
  final String role;

  /// The backend stores the role as text (create-admin.js writes "Admin").
  /// Anything that is not an admin is treated as a student, which is the
  /// safe default for permissions.
  bool get isAdmin => role.trim().toLowerCase() == 'admin';

  String get roleLabel => isAdmin ? 'Admin' : 'Student';
}
