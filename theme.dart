import 'package:flutter/material.dart';

/// Colours copied from the CampusFix website (src/App.css) so the mobile app
/// looks like the same product.
class CfColors {
  const CfColors._();

  static const Color navy = Color(0xFF182235); // primary buttons, headers
  static const Color background = Color(0xFFF5F7FB); // page background
  static const Color card = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE5E9F0);
  static const Color heading = Color(0xFF202B3E);
  static const Color body = Color(0xFF424C60);
  static const Color muted = Color(0xFF7B8597);
  static const Color placeholder = Color(0xFF9CA9C2);

  static const Color blue = Color(0xFF5268BD);
  static const Color blueBg = Color(0xFFEDF1FF);

  static const Color criticalFg = Color(0xFFD65D5D);
  static const Color criticalBg = Color(0xFFFFF0F0);
  static const Color highFg = Color(0xFFB77B23);
  static const Color highBg = Color(0xFFFFF5E4);
  static const Color mediumFg = Color(0xFF5268BD);
  static const Color mediumBg = Color(0xFFEDF1FF);
  static const Color lowFg = Color(0xFF47855E);
  static const Color lowBg = Color(0xFFE8F6ED);

  static const Color neutralPillBg = Color(0xFFEDF0F5);
  static const Color neutralPillFg = Color(0xFF596477);
  static const Color categoryPillBg = Color(0xFFF2F4F8);
  static const Color categoryPillFg = Color(0xFF7A8495);

  static const Color danger = Color(0xFFDC6868);
  static const Color dangerBg = Color(0xFFFFF6F6);
}

/// Radius used for cards on the website (18px).
const double kCardRadius = 18;

ThemeData buildCampusFixTheme() {
  final ColorScheme scheme = ColorScheme.fromSeed(
    seedColor: CfColors.navy,
    brightness: Brightness.light,
  ).copyWith(
    primary: CfColors.navy,
    onPrimary: Colors.white,
    error: CfColors.danger,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: CfColors.background,
  );
}

/// Shared look for every text field.
InputDecoration cfInputDecoration(String label, {String? hint, Widget? suffix}) {
  OutlineInputBorder border(Color color) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: color),
      );

  return InputDecoration(
    labelText: label,
    hintText: hint,
    suffixIcon: suffix,
    filled: true,
    fillColor: Colors.white,
    labelStyle: const TextStyle(color: CfColors.muted),
    hintStyle: const TextStyle(color: CfColors.placeholder),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    border: border(CfColors.border),
    enabledBorder: border(CfColors.border),
    focusedBorder: border(CfColors.navy),
    errorBorder: border(CfColors.danger),
    focusedErrorBorder: border(CfColors.danger),
  );
}

/// Primary (navy) button style, like the website's main buttons.
ButtonStyle cfPrimaryButtonStyle() => FilledButton.styleFrom(
      backgroundColor: CfColors.navy,
      foregroundColor: Colors.white,
      minimumSize: const Size.fromHeight(50),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
    );
