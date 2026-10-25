/// Lists and scoring rules ported 1:1 from the website (src/App.jsx) so an
/// issue reported from the app gets the same priority/team as one reported on
/// the website.
library;

const List<String> kCategories = <String>[
  'Infrastructure',
  'Electrical',
  'Water & Sanitation',
  'Cleanliness',
  'Internet',
  'Safety',
  'Hostel',
  'Classroom',
  'Other',
];

const List<String> kLocations = <String>[
  'Main Block',
  'Library',
  'Computer Lab',
  'CSE Block',
  'ECE Block',
  'Hostel',
  'Cafeteria',
  'Parking Area',
  'Sports Ground',
];

/// Must match `allowedStatuses` in backend/src/routes/issues.js.
const List<String> kStatuses = <String>[
  'Pending',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
];

const List<String> kUrgencies = <String>['Low', 'Medium', 'High'];

const Map<String, int> _urgencyScore = <String, int>{
  'Low': 10,
  'Medium': 25,
  'High': 40,
  'Critical': 40,
};

const Map<String, int> _categoryScore = <String, int>{
  'Safety': 20,
  'Electrical': 18,
  'Water & Sanitation': 18,
  'Internet': 16,
  'Infrastructure': 16,
  'Hostel': 14,
  'Cleanliness': 12,
  'Classroom': 12,
  'Other': 8,
};

const Map<String, int> _locationScore = <String, int>{
  'Main Block': 10,
  'Library': 9,
  'Computer Lab': 9,
  'CSE Block': 8,
  'ECE Block': 8,
  'Hostel': 8,
  'Cafeteria': 7,
  'Parking Area': 6,
  'Sports Ground': 5,
};

const Map<String, String> _teams = <String, String>{
  'Infrastructure': 'Maintenance',
  'Electrical': 'Electrical Team',
  'Water & Sanitation': 'Maintenance',
  'Cleanliness': 'Housekeeping',
  'Internet': 'IT Support',
  'Safety': 'Security',
  'Hostel': 'Hostel Administration',
  'Classroom': 'Academic Facilities',
  'Other': 'Campus Support',
};

/// Same formula as `calculatePriority` on the website.
int calculatePriority({
  required String urgency,
  required int affected,
  required String category,
  required String location,
}) {
  final int urgencyPoints = _urgencyScore[urgency] ?? 20;
  final int safeAffected = affected < 1 ? 1 : affected;
  final int affectedPoints = safeAffected * 2 > 30 ? 30 : safeAffected * 2;
  final int categoryPoints = _categoryScore[category] ?? 8;
  final int locationPoints = _locationScore[location] ?? 5;

  final int total =
      urgencyPoints + affectedPoints + categoryPoints + locationPoints;
  return total > 100 ? 100 : total;
}

String teamForCategory(String category) =>
    _teams[category] ?? 'Campus Support';

enum PriorityLevel { critical, high, medium, low }

PriorityLevel priorityLevel(int priority) {
  if (priority >= 85) return PriorityLevel.critical;
  if (priority >= 70) return PriorityLevel.high;
  if (priority >= 50) return PriorityLevel.medium;
  return PriorityLevel.low;
}

String priorityLabel(int priority) {
  switch (priorityLevel(priority)) {
    case PriorityLevel.critical:
      return 'Critical';
    case PriorityLevel.high:
      return 'High';
    case PriorityLevel.medium:
      return 'Medium';
    case PriorityLevel.low:
      return 'Low';
  }
}
