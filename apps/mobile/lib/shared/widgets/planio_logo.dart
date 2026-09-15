import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class PlanioLogo extends StatelessWidget {
  const PlanioLogo({super.key, this.height = 28});

  final double height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/brand/planio-logo.svg',
      height: height,
      semanticsLabel: 'Planio',
    );
  }
}
