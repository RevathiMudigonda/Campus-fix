/// One row of `public.issues`, using the column names returned by
/// `GET /api/issues` (SELECT *).
class Issue {
  const Issue({
    required this.issueId,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    required this.urgency,
    required this.affectedCount,
    required this.priority,
    required this.status,
    required this.team,
    required this.reportedBy,
    required this.createdAt,
  });

  /// Public id such as "CF-1730000000000-123". All update/delete endpoints use
  /// this value, not the numeric primary key.
  final String issueId;
  final String title;
  final String description;
  final String category;
  final String location;
  final String urgency;
  final int affectedCount;
  final int priority;
  final String status;
  final String team;
  final String reportedBy;
  final DateTime? createdAt;

  factory Issue.fromJson(Map<String, dynamic> json) {
    return Issue(
      issueId: _text(json['issue_id'], ''),
      title: _text(json['title'], 'Untitled'),
      description: _text(json['description'], ''),
      category: _text(json['category'], 'Other'),
      location: _text(json['location'], 'Main Block'),
      urgency: _text(json['urgency'], 'Medium'),
      affectedCount: _int(json['affected_count'], 1),
      priority: _int(json['priority'], 50),
      status: _text(json['status'], 'Pending'),
      team: _text(json['team'], 'Campus Support'),
      reportedBy: _text(json['reported_by'], 'unknown'),
      createdAt: DateTime.tryParse(_text(json['created_at'], '')),
    );
  }

  Issue copyWith({String? status}) {
    return Issue(
      issueId: issueId,
      title: title,
      description: description,
      category: category,
      location: location,
      urgency: urgency,
      affectedCount: affectedCount,
      priority: priority,
      status: status ?? this.status,
      team: team,
      reportedBy: reportedBy,
      createdAt: createdAt,
    );
  }

  static String _text(Object? value, String fallback) {
    if (value == null) return fallback;
    final String text = value.toString();
    return text.isEmpty ? fallback : text;
  }

  static int _int(Object? value, int fallback) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }
}
