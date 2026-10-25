import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme.dart';
import '../utils/priority.dart';

/// Navy app bar used on every screen (website header colour).
AppBar cfAppBar(String title, {List<Widget>? actions}) {
  return AppBar(
    title: Text(
      title,
      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
    ),
    backgroundColor: CfColors.navy,
    foregroundColor: Colors.white,
    elevation: 0,
    actions: actions,
  );
}

/// White rounded card with the website's border.
class CfCard extends StatelessWidget {
  const CfCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: CfColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kCardRadius),
        side: const BorderSide(color: CfColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text, {required this.background, required this.foreground});

  final String text;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.status, {super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final bool resolved = status == 'Resolved';
    return _Pill(
      status,
      background: resolved ? CfColors.lowBg : CfColors.neutralPillBg,
      foreground: resolved ? CfColors.lowFg : CfColors.neutralPillFg,
    );
  }
}

class CategoryPill extends StatelessWidget {
  const CategoryPill(this.category, {super.key});

  final String category;

  @override
  Widget build(BuildContext context) {
    return _Pill(
      category,
      background: CfColors.categoryPillBg,
      foreground: CfColors.categoryPillFg,
    );
  }
}

class PriorityBadge extends StatelessWidget {
  const PriorityBadge(this.priority, {super.key});

  final int priority;

  @override
  Widget build(BuildContext context) {
    final List<Color> colors = switch (priorityLevel(priority)) {
      PriorityLevel.critical => <Color>[CfColors.criticalBg, CfColors.criticalFg],
      PriorityLevel.high => <Color>[CfColors.highBg, CfColors.highFg],
      PriorityLevel.medium => <Color>[CfColors.mediumBg, CfColors.mediumFg],
      PriorityLevel.low => <Color>[CfColors.lowBg, CfColors.lowFg],
    };
    return _Pill(
      '${priorityLabel(priority)} · $priority',
      background: colors[0],
      foreground: colors[1],
    );
  }
}

/// A labelled drop-down built on Flutter's core [DropdownButton], wrapped in an
/// [InputDecorator] so it looks like the text fields.
class CfDropdown extends StatelessWidget {
  const CfDropdown({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    // Guard: DropdownButton asserts if value is not in items.
    final String safeValue = items.contains(value) ? value : items.first;
    return InputDecorator(
      decoration: cfInputDecoration(label).copyWith(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: safeValue,
          isExpanded: true,
          borderRadius: BorderRadius.circular(12),
          items: items
              .map(
                (String item) => DropdownMenuItem<String>(
                  value: item,
                  child: Text(item, overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onChanged: onChanged == null
              ? null
              : (String? picked) {
                  if (picked != null) onChanged!(picked);
                },
        ),
      ),
    );
  }
}

void showSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Shows an error. If the server says the token is no good (expired after 2 h,
/// or invalid), the user is sent back to the login screen.
///
/// Call only when the widget is still mounted.
void handleApiError(BuildContext context, Object error) {
  if (error is ApiException) {
    if (error.isUnauthorized) {
      ApiService.instance.signOut();
      Navigator.of(context).pushNamedAndRemoveUntil(
        '/login',
        (Route<dynamic> route) => false,
        arguments: 'Your session expired. Please sign in again.',
      );
      return;
    }
    showSnack(context, error.message);
    return;
  }
  showSnack(context, 'Something went wrong. Please try again.');
}

String formatDate(DateTime? value) {
  if (value == null) return '';
  const List<String> months = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  final DateTime local = value.toLocal();
  return '${local.day} ${months[local.month - 1]} ${local.year}';
}
