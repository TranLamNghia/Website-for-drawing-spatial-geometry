using System;
using System.Linq;
using Application.DTOs;
using Application.DTOs.Enums;
using Application.DTOs.Facts;
using Domains.MathCore;

namespace Application.Compilers.FactHandlers;

public class TangentHandler : IFactHandler
{
    public FactType TargetFactType => FactType.Tangent;

    public void Handle(FactDto fact, CompilationContext context)
    {
        var data = fact.GetDataAs<TangentData>();
        if (data?.Objects == null || data.Objects.Count < 2) return;

        var obj1 = NormalizeName(data.Objects[0]);
        var obj2 = NormalizeName(data.Objects[1]);

        var sphere = FindSphere(context, obj1, obj2);
        if (sphere == null)
        {
            LogOnly(data);
            return;
        }

        var center = EnsurePoint(context, sphere.Center, new Point3D(0, 0, 0));
        double radius = sphere.Radius > 0 ? sphere.Radius : context.UnitLength;

        string tangentPoint = string.IsNullOrWhiteSpace(data.Point) ? "K" : data.Point.Trim();
        EnsurePoint(context, tangentPoint, new Point3D(center.X + radius, center.Y, center.Z));

        var plane = context.GetPlane(obj1) ?? context.GetPlane(obj2);
        string? planeLabel = plane != null
            ? (context.GetPlane(obj1) != null ? obj1 : obj2)
            : ResolveNamedPlaneLabel(context, obj1, obj2);

        if (plane == null && planeLabel != null)
        {
            var kPt = context.Points[tangentPoint];
            double extent = radius * 1.5;
            string aux1 = $"_{planeLabel}_1";
            string aux2 = $"_{planeLabel}_2";
            context.Points[aux1] = new Point3D(kPt.X, kPt.Y + extent, kPt.Z);
            context.Points[aux2] = new Point3D(kPt.X, kPt.Y, kPt.Z + extent);
            plane = new Plane3D(kPt, context.Points[aux1], context.Points[aux2]);
            context.NamedPlanes[planeLabel] = plane;

            context.GeneratedPlanes.Add(new PlaneData
            {
                Points = new[] { tangentPoint, aux1, aux2 },
                Color = "#6671d1",
                Opacity = 0.22,
                Density = 14,
                IsSolidFace = false,
            });
        }

        Console.WriteLine(
            $"[HANDLER] Dựng tiếp tuyến: mặt phẳng ({planeLabel ?? "?"}) tiếp xúc mặt cầu {sphere.Center} tại {tangentPoint}");
    }

    private static void LogOnly(TangentData data)
    {
        var pointInfo = string.IsNullOrEmpty(data.Point) ? string.Empty : $" tại {data.Point}";
        Console.WriteLine($"[HANDLER] Ghi nhận tiếp tuyến: {data.Objects[0]} ~ {data.Objects[1]}{pointInfo}");
    }

    private static Point3D EnsurePoint(CompilationContext context, string name, Point3D fallback)
    {
        if (context.Points.TryGetValue(name, out var existing))
            return existing;

        context.Points[name] = fallback;
        return fallback;
    }

    private static string? ResolveNamedPlaneLabel(CompilationContext context, string obj1, string obj2)
    {
        foreach (var candidate in new[] { obj1, obj2 })
        {
            if (IsPlaneLikeLabel(context, candidate))
                return candidate;
        }
        return null;
    }

    private static bool IsPlaneLikeLabel(CompilationContext context, string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        if (ParseVertices(name).Count >= 3) return false;
        if (ReferencesSphere(context, name)) return false;
        return true;
    }

    private static SphereData? FindSphere(CompilationContext context, string obj1, string obj2)
    {
        foreach (var sphere in context.Spheres)
        {
            if (ReferencesSphere(context, sphere, obj1) || ReferencesSphere(context, sphere, obj2))
                return sphere;
        }

        // Một mặt cầu duy nhất + một tham chiếu mặt phẳng (P ~ S hoặc P ~ O)
        if (context.Spheres.Count == 1 &&
            (IsPlaneLikeLabel(context, obj1) || IsPlaneLikeLabel(context, obj2)))
        {
            return context.Spheres.First();
        }

        return null;
    }

    private static bool ReferencesSphere(CompilationContext context, string obj)
    {
        if (string.IsNullOrWhiteSpace(obj)) return false;
        return context.Spheres.Any(s => ReferencesSphere(context, s, obj));
    }

    private static bool ReferencesSphere(CompilationContext context, SphereData sphere, string obj)
    {
        if (sphere.Center.Equals(obj, StringComparison.OrdinalIgnoreCase)) return true;
        if (obj.Contains(sphere.Center, StringComparison.OrdinalIgnoreCase)) return true;

        foreach (var fact in context.SourceFacts.Where(f => f.Type == FactType.Shape))
        {
            if (fact.GetDataAs<ShapeData>() is not ShapeData sd) continue;
            if (sd.Shape != ShapeType.Sphere && sd.Shape != ShapeType.Regular_sphere) continue;
            if (!string.Equals(sd.Target, obj, StringComparison.OrdinalIgnoreCase)) continue;
            if (string.IsNullOrEmpty(sd.Center) ||
                sd.Center.Equals(sphere.Center, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private static string NormalizeName(string name) =>
        name.Replace("(", string.Empty).Replace(")", string.Empty).Trim();

    private static System.Collections.Generic.List<string> ParseVertices(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return new System.Collections.Generic.List<string>();
        return System.Text.RegularExpressions.Regex.Matches(input, @"[A-Z][0-9]*'*")
            .Cast<System.Text.RegularExpressions.Match>()
            .Select(m => m.Value.ToUpper())
            .ToList();
    }
}
