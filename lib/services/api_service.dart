import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/auth_session.dart';
import '../models/issue.dart';

/// An error that is safe to show to the user.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  /// True when the server rejected our token (missing, invalid or expired).
  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;
}

/// All network access goes through this class. It only calls endpoints that
/// exist in the backend (backend/src/routes/*.js):
///
///   POST   /api/auth/login
///   GET    /api/issues
///   POST   /api/issues
///   PATCH  /api/issues/:issueId/status
///   DELETE /api/issues/:issueId        (needs the backend patch, admin only)
class ApiService {
  ApiService({http.Client? client}) : _client = client ?? http.Client();

  /// Shared instance used by the screens.
  static ApiService instance = ApiService();

  final http.Client _client;

  /// Set after login; cleared on logout / expired session. In memory only.
  AuthSession? session;

  Uri _uri(String path) => Uri.parse('${AppConfig.apiBaseUrl}$path');

  Map<String, String> get _headers => <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (session != null) 'Authorization': 'Bearer ${session!.token}',
      };

  void signOut() => session = null;

  // ---------------------------------------------------------------- auth

  Future<AuthSession> login(String username, String password) async {
    final http.Response response = await _send(
      () => _client.post(
        _uri('/auth/login'),
        headers: _headers,
        body: jsonEncode(<String, String>{
          'username': username,
          'password': password,
        }),
      ),
    );

    final Map<String, dynamic> body = _decodeObject(response);
    if (response.statusCode != 200) {
      throw ApiException(
        _messageOf(body, 'Login failed.'),
        statusCode: response.statusCode,
      );
    }

    final Object? token = body['token'];
    final Object? user = body['user'];
    if (token is! String || user is! Map) {
      throw const ApiException('Unexpected response from the server.');
    }

    final AuthSession newSession = AuthSession(
      token: token,
      username: user['username']?.toString() ?? username,
      role: user['role']?.toString() ?? 'Student',
    );
    session = newSession;
    return newSession;
  }

  // -------------------------------------------------------------- issues

  /// READ
  Future<List<Issue>> getIssues() async {
    final http.Response response =
        await _send(() => _client.get(_uri('/issues'), headers: _headers));

    if (response.statusCode != 200) {
      throw _errorFrom(response, 'Could not load issues.');
    }

    final Object? decoded = _tryDecode(response.body);
    if (decoded is! List) {
      throw const ApiException('Unexpected response from the server.');
    }
    return decoded
        .whereType<Map>()
        .map((Map item) => Issue.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  /// CREATE
  Future<Issue> createIssue({
    required String title,
    required String description,
    required String category,
    required String location,
    required String urgency,
    required int affectedCount,
    required int priority,
    required String team,
    required String reportedBy,
  }) async {
    final http.Response response = await _send(
      () => _client.post(
        _uri('/issues'),
        headers: _headers,
        body: jsonEncode(<String, Object>{
          'title': title,
          'description': description,
          'category': category,
          'location': location,
          'urgency': urgency,
          'affected_count': affectedCount,
          'priority': priority,
          'status': 'Pending',
          'team': team,
          'reported_by': reportedBy,
        }),
      ),
    );

    if (response.statusCode != 201) {
      throw _errorFrom(response, 'Could not submit the issue.');
    }
    final Map<String, dynamic> body = _decodeObject(response);
    final Object? issue = body['issue'];
    if (issue is! Map) {
      throw const ApiException('Unexpected response from the server.');
    }
    return Issue.fromJson(Map<String, dynamic>.from(issue));
  }

  /// UPDATE (status)
  Future<Issue> updateStatus(String issueId, String status) async {
    final http.Response response = await _send(
      () => _client.patch(
        _uri('/issues/${Uri.encodeComponent(issueId)}/status'),
        headers: _headers,
        body: jsonEncode(<String, String>{'status': status}),
      ),
    );

    if (response.statusCode != 200) {
      throw _errorFrom(response, 'Could not update the status.');
    }
    final Map<String, dynamic> body = _decodeObject(response);
    final Object? issue = body['issue'];
    if (issue is! Map) {
      throw const ApiException('Unexpected response from the server.');
    }
    return Issue.fromJson(Map<String, dynamic>.from(issue));
  }

  /// DELETE (admin only - enforced by the server once the backend patch is
  /// deployed; the UI also hides the button from students).
  Future<void> deleteIssue(String issueId) async {
    final AuthSession? current = session;
    if (current == null || !current.isAdmin) {
      throw const ApiException('Only administrators can delete issues.');
    }

    final http.Response response = await _send(
      () => _client.delete(
        _uri('/issues/${Uri.encodeComponent(issueId)}'),
        headers: _headers,
      ),
    );

    if (response.statusCode == 200 || response.statusCode == 204) return;

    // Express answers an unknown route with an HTML "Cannot DELETE ..." page.
    // Our own 404 is JSON ("Issue not found."), so this tells them apart.
    if (response.statusCode == 404 && _tryDecode(response.body) == null) {
      throw const ApiException(
        'Delete is not available on the server yet. '
        'Deploy the backend delete route first.',
        statusCode: 404,
      );
    }
    throw _errorFrom(response, 'Could not delete the issue.');
  }

  // ------------------------------------------------------------- helpers

  Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      return await request().timeout(AppConfig.requestTimeout);
    } on TimeoutException {
      throw const ApiException(
        'The server took too long to respond. It may be waking up - '
        'please try again in a moment.',
      );
    } catch (_) {
      throw const ApiException(
        'Cannot reach the server. Check your internet connection.',
      );
    }
  }

  ApiException _errorFrom(http.Response response, String fallback) {
    final Map<String, dynamic> body = _decodeObject(response);
    String message = _messageOf(body, fallback);
    if (response.statusCode == 401) {
      message = 'Your session has expired. Please sign in again.';
    } else if (response.statusCode == 403) {
      message = _messageOf(body, 'You do not have permission to do that.');
    }
    return ApiException(message, statusCode: response.statusCode);
  }

  Object? _tryDecode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _decodeObject(http.Response response) {
    final Object? decoded = _tryDecode(response.body);
    return decoded is Map ? Map<String, dynamic>.from(decoded) : <String, dynamic>{};
  }

  String _messageOf(Map<String, dynamic> body, String fallback) {
    final Object? message = body['message'];
    return message is String && message.isNotEmpty ? message : fallback;
  }
}
