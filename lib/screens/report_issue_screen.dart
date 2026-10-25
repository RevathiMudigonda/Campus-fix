import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/issue.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../utils/priority.dart';
import '../widgets/cf_widgets.dart';

/// CREATE: the "Report an issue" Form. Validation rules and the priority
/// formula match the website (title 5-100, description 15-400, 1-1000
/// students affected).
class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({super.key});

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _title = TextEditingController();
  final TextEditingController _description = TextEditingController();
  final TextEditingController _affected = TextEditingController(text: '1');

  String _category = kCategories.first;
  String _location = kLocations.first;
  String _urgency = 'Medium';
  bool _saving = false;

  int get _affectedCount => int.tryParse(_affected.text.trim()) ?? 1;

  int get _priorityPreview => calculatePriority(
        urgency: _urgency,
        affected: _affectedCount,
        category: _category,
        location: _location,
      );

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _affected.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_saving) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final String? username = ApiService.instance.session?.username;
    if (username == null) {
      handleApiError(
        context,
        const ApiException('Please sign in again.', statusCode: 401),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final Issue created = await ApiService.instance.createIssue(
        title: _title.text.trim(),
        description: _description.text.trim(),
        category: _category,
        location: _location,
        urgency: _urgency,
        affectedCount: _affectedCount,
        priority: _priorityPreview,
        team: teamForCategory(_category),
        reportedBy: username,
      );
      if (!mounted) return;
      Navigator.of(context).pop(created);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      handleApiError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final int priority = _priorityPreview;

    return Scaffold(
      appBar: cfAppBar('Report an issue'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: <Widget>[
            Form(
              key: _formKey,
              child: CfCard(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    TextFormField(
                      controller: _title,
                      enabled: !_saving,
                      maxLength: 100,
                      textInputAction: TextInputAction.next,
                      decoration: cfInputDecoration(
                        'Issue title',
                        hint: 'Example: Wi-Fi not working in lab',
                      ),
                      validator: (String? value) {
                        final String text = value?.trim() ?? '';
                        if (text.isEmpty) return 'Please enter an issue title';
                        if (text.length < 5) {
                          return 'Title must contain at least 5 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _description,
                      enabled: !_saving,
                      maxLength: 400,
                      minLines: 4,
                      maxLines: 6,
                      decoration: cfInputDecoration(
                        'Description',
                        hint: 'Describe the problem, where it happens and '
                            'how it affects students...',
                      ),
                      validator: (String? value) {
                        final String text = value?.trim() ?? '';
                        if (text.isEmpty) return 'Please describe the issue';
                        if (text.length < 15) {
                          return 'Please provide a little more detail '
                              '(15+ characters)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),
                    CfDropdown(
                      label: 'Category',
                      value: _category,
                      items: kCategories,
                      onChanged: _saving
                          ? null
                          : (String v) => setState(() => _category = v),
                    ),
                    const SizedBox(height: 14),
                    CfDropdown(
                      label: 'Campus location',
                      value: _location,
                      items: kLocations,
                      onChanged: _saving
                          ? null
                          : (String v) => setState(() => _location = v),
                    ),
                    const SizedBox(height: 14),
                    CfDropdown(
                      label: 'Urgency',
                      value: _urgency,
                      items: kUrgencies,
                      onChanged: _saving
                          ? null
                          : (String v) => setState(() => _urgency = v),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _affected,
                      enabled: !_saving,
                      keyboardType: TextInputType.number,
                      inputFormatters: <TextInputFormatter>[
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      onChanged: (_) => setState(() {}),
                      decoration: cfInputDecoration('Students affected'),
                      validator: (String? value) {
                        final int? count = int.tryParse(value?.trim() ?? '');
                        if (count == null || count < 1) {
                          return 'At least one student must be affected';
                        }
                        if (count > 1000) return 'Maximum is 1000';
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            CfCard(
              child: Row(
                children: <Widget>[
                  const Expanded(
                    child: Text(
                      'Estimated priority',
                      style: TextStyle(
                        color: CfColors.heading,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  PriorityBadge(priority),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              style: cfPrimaryButtonStyle(),
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Submit issue'),
            ),
          ],
        ),
      ),
    );
  }
}
