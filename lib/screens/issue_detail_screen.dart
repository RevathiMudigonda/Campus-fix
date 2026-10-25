import 'package:flutter/material.dart';

import '../models/auth_session.dart';
import '../models/issue.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../utils/priority.dart';
import '../widgets/cf_widgets.dart';

/// What the detail screen reports back to the list when it closes.
class IssueChange {
  const IssueChange.updated(Issue this.updated) : deletedId = null;
  const IssueChange.deleted(String this.deletedId) : updated = null;

  final Issue? updated;
  final String? deletedId;
}

/// VIEW one issue. Admins can also UPDATE its status and DELETE it; students
/// get a read-only screen with no such controls.
class IssueDetailScreen extends StatefulWidget {
  const IssueDetailScreen({
    super.key,
    required this.issue,
    required this.session,
  });

  final Issue issue;
  final AuthSession session;

  @override
  State<IssueDetailScreen> createState() => _IssueDetailScreenState();
}

class _IssueDetailScreenState extends State<IssueDetailScreen> {
  late Issue _issue;
  late String _selectedStatus;
  bool _busy = false;

  bool get _isAdmin => widget.session.isAdmin;
  bool get _statusChanged => _selectedStatus != _issue.status;

  @override
  void initState() {
    super.initState();
    _issue = widget.issue;
    _selectedStatus = _issue.status;
  }

  Future<void> _saveStatus() async {
    if (!_isAdmin || _busy || !_statusChanged) return;
    setState(() => _busy = true);
    try {
      final Issue updated = await ApiService.instance
          .updateStatus(_issue.issueId, _selectedStatus);
      if (!mounted) return;
      Navigator.of(context).pop(IssueChange.updated(updated));
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      handleApiError(context, error);
    }
  }

  Future<void> _confirmDelete() async {
    // Defence in depth: the button is not even built for students, and the
    // server must also reject non-admin deletes.
    if (!_isAdmin || _busy) return;

    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) => AlertDialog(
        title: const Text('Delete this issue?'),
        content: Text(
          '"${_issue.title}" will be permanently removed from the database. '
          'This cannot be undone.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: CfColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await ApiService.instance.deleteIssue(_issue.issueId);
      if (!mounted) return;
      Navigator.of(context).pop(IssueChange.deleted(_issue.issueId));
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _busy = false);
      handleApiError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: cfAppBar('Issue details'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          CfCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  _issue.issueId,
                  style: const TextStyle(
                    color: CfColors.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    CategoryPill(_issue.category),
                    StatusPill(_issue.status),
                    PriorityBadge(_issue.priority),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  _issue.title,
                  style: const TextStyle(
                    color: CfColors.heading,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _issue.description,
                  style: const TextStyle(color: CfColors.body, height: 1.45),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          CfCard(
            child: Column(
              children: <Widget>[
                _DetailRow('Location', _issue.location),
                _DetailRow('Urgency', _issue.urgency),
                _DetailRow('Students affected', '${_issue.affectedCount}'),
                _DetailRow('Assigned team', _issue.team),
                _DetailRow('Reported by', _issue.reportedBy),
                _DetailRow('Reported on', formatDate(_issue.createdAt)),
              ],
            ),
          ),
          if (_isAdmin) ...<Widget>[
            const SizedBox(height: 12),
            CfCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  const Text(
                    'ADMIN ACTIONS',
                    style: TextStyle(
                      color: CfColors.muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 12),
                  CfDropdown(
                    label: 'Update status',
                    value: _selectedStatus,
                    items: kStatuses,
                    onChanged: _busy
                        ? null
                        : (String value) =>
                            setState(() => _selectedStatus = value),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    style: cfPrimaryButtonStyle(),
                    onPressed: (_busy || !_statusChanged) ? null : _saveStatus,
                    child: _busy
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Save status'),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _confirmDelete,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: CfColors.danger,
                      side: const BorderSide(color: CfColors.danger),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.delete_outline),
                    label: const Text('Delete issue'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: const TextStyle(color: CfColors.muted, fontSize: 13),
            ),
          ),
          Expanded(
            flex: 6,
            child: Text(
              value.isEmpty ? '-' : value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                color: CfColors.heading,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
