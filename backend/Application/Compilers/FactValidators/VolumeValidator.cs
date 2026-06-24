using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactValidators;

public class VolumeValidator : IFactValidator
{
    public FactType TargetFactType => FactType.Volume;

    public ValidationResult Validate(FactDto fact, CompilationContext context, double unitLength)
    {
        var data = fact.GetDataAs<VolumeData>();
        if (data == null || string.IsNullOrWhiteSpace(data.Target) || string.IsNullOrWhiteSpace(data.Value))
            return ValidationResult.Skip(fact.Id, "Volume", "Thiếu dữ liệu target/value");

        var shape = FactGeometryHelper.NormalizeShape(data.Shape);
        if (shape == ShapeType.Triangle)
            shape = FactGeometryHelper.InferVolumeShape(data.Target);

        double? actualVolume = TryComputeVolume(shape, data, context);
        if (actualVolume == null)
            return ValidationResult.Skip(fact.Id, "Volume", $"Chưa đủ dữ liệu để tính thể tích cho {data.Target}");

        double expectedVolume = FactGeometryHelper.EvaluateExpression(data.Value, unitLength);
        double tolerance = expectedVolume * 0.01;

        if (Math.Abs(expectedVolume - actualVolume.Value) <= Math.Max(tolerance, 0.05))
            return ValidationResult.Pass(fact.Id, "Volume", expectedVolume, actualVolume.Value);

        return ValidationResult.Fail(fact.Id, "Volume", expectedVolume, actualVolume.Value);
    }

    private double? TryComputeVolume(ShapeType shape, VolumeData data, CompilationContext context)
    {
        var targetVertices = FactGeometryHelper.ParseVertices(data.Target);
        var targetPoints = FactGeometryHelper.GetPoints(context, data.Target);

        switch (shape)
        {
            case ShapeType.Sphere:
            {
                string? centerName = data.Center ?? (targetVertices.Count == 1 ? targetVertices[0] : null);
                var sphere = !string.IsNullOrWhiteSpace(centerName)
                    ? context.Spheres.FirstOrDefault(s => s.Center == centerName)
                    : context.Spheres.FirstOrDefault();

                if (sphere == null)
                {
                    if (double.TryParse(data.Radius, out var radius))
                        return FactGeometryHelper.SphereVolume(radius);
                    return null;
                }

                return FactGeometryHelper.SphereVolume(sphere.Radius);
            }
            case ShapeType.Cylinder:
            {
                string? centerBottom = data.Center;
                var cylinder = !string.IsNullOrWhiteSpace(centerBottom)
                    ? context.Cylinders.FirstOrDefault(c => c.CenterBottom == centerBottom || c.CenterTop == centerBottom)
                    : context.Cylinders.FirstOrDefault();

                if (cylinder != null)
                {
                    var bottom = context.GetPoint(cylinder.CenterBottom);
                    var top = context.GetPoint(cylinder.CenterTop);
                    if (bottom != null && top != null)
                    {
                        return FactGeometryHelper.CylinderVolume(cylinder.Radius, bottom.DistanceToPoint(top));
                    }
                    if (double.TryParse(data.Height, out var height))
                        return FactGeometryHelper.CylinderVolume(cylinder.Radius, height);
                }

                return null;
            }
            case ShapeType.Cone:
            {
                string? apexName = data.Apex;
                var cone = !string.IsNullOrWhiteSpace(apexName)
                    ? context.Cones.FirstOrDefault(c => c.Apex == apexName || c.Center == apexName)
                    : context.Cones.FirstOrDefault();

                if (cone != null)
                {
                    var apex = context.GetPoint(cone.Apex);
                    var center = context.GetPoint(cone.Center);
                    if (apex != null && center != null)
                    {
                        return FactGeometryHelper.ConeVolume(cone.Radius, center.DistanceToPoint(apex));
                    }
                    if (double.TryParse(data.Height, out var height))
                        return FactGeometryHelper.ConeVolume(cone.Radius, height);
                }

                return null;
            }
            case ShapeType.Tetrahedron:
            case ShapeType.Regular_tetrahedron:
            {
                if (targetPoints.Count >= 4)
                    return FactGeometryHelper.TetrahedronVolume(targetPoints[0], targetPoints[1], targetPoints[2], targetPoints[3]);
                return null;
            }
            case ShapeType.Pyramid:
            case ShapeType.Regular_pyramid:
            case ShapeType.Pentagonal_pyramid:
            case ShapeType.Hexagonal_pyramid:
            {
                if (targetPoints.Count >= 4)
                    return FactGeometryHelper.PyramidVolume(targetPoints);
                return null;
            }
            case ShapeType.Prism:
            case ShapeType.Regular_prism:
            case ShapeType.Cube:
            case ShapeType.Regular_cube:
            case ShapeType.Rectangular_cuboid:
            case ShapeType.Regular_rectangular_cuboid:
            case ShapeType.Parallelepiped:
            case ShapeType.Regular_parallelepiped:
            case ShapeType.Pentagonal_prism:
            case ShapeType.Hexagonal_prism:
            {
                if (data.Target.Contains('.'))
                {
                    var parts = data.Target.Split('.');
                    var basePts = FactGeometryHelper.GetPoints(context, parts[0]);
                    var topPts = FactGeometryHelper.GetPoints(context, parts.Length > 1 ? parts[1] : string.Empty);
                    if (basePts.Count >= 3 && topPts.Count >= 3 && basePts.Count == topPts.Count)
                        return FactGeometryHelper.PrismVolume(basePts, topPts);
                }
                else if (targetPoints.Count >= 6 && targetPoints.Count % 2 == 0)
                {
                    int half = targetPoints.Count / 2;
                    var basePts = targetPoints.Take(half).ToList();
                    var topPts = targetPoints.Skip(half).ToList();
                    if (basePts.Count == topPts.Count && basePts.Count >= 3)
                        return FactGeometryHelper.PrismVolume(basePts, topPts);
                }
                return null;
            }
            default:
                return null;
        }
    }
}
