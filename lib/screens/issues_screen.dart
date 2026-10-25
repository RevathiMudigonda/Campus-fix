import 'package:flutter/material.dart';

import '../models/auth_session.dart';
import '../models/issue.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../utils/priority.dart';
import '../widgets/cf_widgets.dart';
import 'issue_detail_screen.dart';
import 'report_issue_screen.dart';

/// Home screen: lists issues from the database (READ) and opens the
/// report / detail screens (CREATE, UPDATE, DELETE).
class IssuesScreen extends StatefulWidget {
  const IssuesScreen({super.key, required this.session});

  final AuthSession session;

  @override
  State<IssuesScreen> createState() => _IssuesScreenState();
}

class _IssuesScreenState extends State<IssuesScreen> {
  static const String _all = 'All';

  List<Issue> _issues = <Issue>[];
  bool _loading = true;
  String? _loadError;

  // Held in state (not recreated per build) so the text survives the header
  // row being scrolled out of the ListView and back.
  final TextEditingController _searchController = TextEditingController();
  String _search = '';
  String _statusFilter = _all;
  String _categoryFilter = _all;
  bool _mineOnly = false;

  AuthSession get _session => widget.session;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (showSpinner) {
      setState(() {
        _loading = true;
        _loadError = null;
      });
    }
    try {
      final List<Issue> issues = await ApiService.instance.getIssues();
      if (!mounted) return;
      setState(() {
        _issues = issues;
        _loading = false;
        _loadError = null;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      if (error.isUnauthorized) {
        handleApiError(context, error);
        return;
      }
      setState(() {
        _loading = false;
        _loadError = error.message;
      });
    }
  }

  List<Issue> get _visible {
    final String query = _search.trim().toLowerCase();
    return _issues.where((Issue issue) {
      if (_statusFilter != _all && issue.status != _statusFilter) return false;
      if (_categoryFilter != _all && issue.category != _categoryFilter) {
        return false;
      }
      if (_mineOnly && issue.reportedBy != _session.username) return false;
      if (query.isEmpty) return true;
      return issue.title.toLowerCase().contains(query) ||
          issue.description.toLowerCase().contains(query) ||
          issue.issueId.toLowerCase().contains(query) ||
          issue.location.toLowerCase().contains(query);
    }).toList();
  }

  Future<void> _openReport() async {
    final Issue? created = await Navigator.of(context).push<Issue>(
      MaterialPageRoute<Issue>(builder: (_) => const ReportIssueScreen()),
    );
    if (created == null || !mounted) return;
    showSnack(context, 'Issue submitted: ${created.issueId}');
    await _load(showSpinner: false);
  }

  Future<void> _openDetail(Issue issue) async {
    final IssueChange? change = await Navigator.of(context).push<IssueChange>(
      MaterialPageRoute<IssueChange>(
        builder: (_) => IssueDetailScreen(issue: issue, session: _session),
      ),
    );
    if (change == null || !mounted) return;

    setState(() {
      if (change.deletedId != null) {
        _issues = _issues
            .where((Issue item) => item.issueId != change.deletedId)
            .toList();
      } else if (change.updated != null) {
        _issues = _issues
            .map((Issue item) =>
                item.issueId == change.updated!.issueId ? change.updated! : item)
            .toList();
      }
    });
    showSnack(
      context,
      change.deletedId != null ? 'Issue deleted.' : 'Status updated.',
    );
  }

  void _logout() {
    ApiService.instance.signOut();
    Navigator.of(context).pushNamedAndRemoveUntil(
      '/login',
      (Route<dynamic> route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Issue> visible = _visible;
    final bool isAdmin = _session.isAdmin;

    return Scaffold(
      appBar: cfAppBar(
        isAdmin ? 'Issue management' : 'Campus issue board',
        actions: <Widget>[
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _load,
          ),
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      floatingActionButton: isAdmin
          ? null
          : FloatingActionButton.extended(
              onPressed: _openReport,
              backgroundColor: CfColors.navy,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Report issue'),
            ),
      body: RefreshIndicator(
        onRefresh: () => _load(showSpinner: false),
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          // Row 0 is the filter header; then the issues (or one status row).
          itemCount: 1 + (visible.isEmpty ? 1 : visible.length),
          itemBuilder: (BuildContext context, int index) {
            if (index == 0) return _buildHeader(visible.length, isAdmin);
            if (visible.isEmpty) return _buildEmptyState();
            final Issue issue = visible[index - 1];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _IssueCard(issue: issue, onTap: () => _openDetail(issue)),
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader(int shown, bool isAdmin) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Signed in as ${_session.username}',
                  style: const TextStyle(color: CfColors.muted, fontSize: 13),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isAdmin ? CfColors.navy : CfColors.blueBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isAdmin ? 'ADMIN' : 'STUDENT',
                  style: TextStyle(
                    color: isAdmin ? Colors.white : CfColors.blue,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _searchController,
            decoration: cfInputDecoration(
              'Search issues',
              hint: 'Title, description, ID or location',
              suffix: const Icon(Icons.search),
            ),
            onChanged: (String value) => setState(() => _search = value),
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: CfDropdown(
                  label: 'Status',
                  value: _statusFilter,
                  items: const <String>[_all, ...kStatuses],
                  onChanged: (String v) => setState(() => _statusFilter = v),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: CfDropdown(
                  label: 'Category',
                  value: _categoryFilter,
                  items: const <String>[_all, ...kCategories],
                  onChanged: (String v) => setState(() => _categoryFilter = v),
                ),
              ),
            ],
          ),
          if (!isAdmin) ...<Widget>[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: FilterChip(
                label: const Text('My reports only'),
                selected: _mineOnly,
                onSelected: (bool value) => setState(() => _mineOnly = value),
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            _loading ? 'Loading...' : '$shown of ${_issues.length} issues',
            style: const TextStyle(
              color: CfColors.heading,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: <Widget>[
            CircularProgressIndicator(color: CfColors.navy),
            SizedBox(height: 14),
            Text(
              'Loading issues. If the server was idle, this can take up '
              'to a minute.',
              textAlign: TextAlign.center,
              style: TextStyle(color: CfColors.muted),
            ),
          ],
        ),
      );
    }
    if (_loadError != null) {
      return CfCard(
        child: Column(
          children: <Widget>[
            const Icon(Icons.cloud_off, color: CfColors.danger, size: 36),
            const SizedBox(height: 8),
            Text(_loadError!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      );
    }
    return const CfCard(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(
          child: Text(
            'No issues match your filters.',
            style: TextStyle(color: CfColors.muted),
          ),
        ),
      ),
    );
  }
}

class _IssueCard extends StatelessWidget {
  const _IssueCard({required this.issue, required this.onTap});

  final Issue issue;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CfCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              CategoryPill(issue.category),
              StatusPill(issue.status),
              PriorityBadge(issue.priority),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            issue.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: CfColors.heading,
              fontSize: 16,
              fontWeight: FontWeight.w800,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            issue.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: CfColors.body, height: 1.35),
          ),
          const SizedBox(height: 10),
          Row(
            children: <Widget>[
              const Icon(Icons.place_outlined, size: 15, color: CfColors.muted),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  '${issue.location} · ${formatDate(issue.createdAt)}',
                  style: const TextStyle(color: CfColors.muted, fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Icon(Icons.chevron_right, color: CfColors.placeholder),
            ],
          ),
        ],
      ),
    );
  }
}
