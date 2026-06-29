using System;
using System.Collections.Generic;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class InscribedValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Inscribed;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<InscribedData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Inner))
            return ValidationResult.Skip(fact.Id, "Inscribed", "Thiếu dữ liệu inner");

        var actualCenter = context.GetPoint(data.Inner);
        if (actualCenter == null)
            return ValidationResult.Skip(fact.Id, "Inscribed", $"Chưa có tọa độ điểm {data.Inner}");

        string outerExpr = !string.IsNullOrWhiteSpace(data.Outer)
            ? data.Outer
            : data.Points != null && data.Points.Count > 0
                ? string.Concat(data.Points)
                : string.Empty;

        if (string.IsNullOrWhiteSpace(outerExpr))
            return ValidationResult.Skip(fact.Id, "Inscribed", "Thiếu dữ liệu outer/points");

        var points = context.GetPointsFromPlane(outerExpr);
        if (points.Count < 3)
            return ValidationResult.Skip(fact.Id, "Inscribed", $"Chưa có đủ tọa độ cho hình {outerExpr}");

        Point3D? expectedCenter = null;

        if (points.Count == 3)
        {
            expectedCenter = Point3D.GetIncenter(points.ToArray()).Center;
        }
        else if (points.Count == 8)
        {
            expectedCenter = Point3D.GetCentroid(points.ToArray());
        }
        else if (points.Count >= 4)
        {
            var apex = points[0];
            var basePoints = points.Skip(1).ToArray();
            if (basePoints.Length >= 3)
            {
                var faces = new List<Plane3D>();
                faces.Add(new Plane3D(basePoints[0], basePoints[1], basePoints[2]));

                for (int i = 0; i < basePoints.Length; i++)
                {
                    var p1 = basePoints[i];
                    var p2 = basePoints[(i + 1) % basePoints.Length];
                    faces.Add(new Plane3D(apex, p1, p2));
                }

                var baseCentroid = Point3D.GetCentroid(basePoints);
                var interiorPoint = apex.GetMidpoint(baseCentroid);
                var result = Point3D.GetInsphere(faces, interiorPoint);
                expectedCenter = result.Center;
            }
        }

        expectedCenter ??= Point3D.GetIncenter(points.ToArray()).Center;

        double distance = actualCenter.DistanceToPoint(expectedCenter);

        if (distance <= 0.05)
            return ValidationResult.Pass(fact.Id, "Inscribed", 0, distance);

        return ValidationResult.Fail(fact.Id, "Inscribed", 0, distance);
    }
}
