using Domains.MathCore;
using Application.DTOs;
using Application.Compilers.FactValidators;
using System.Linq;
using System.Collections.Generic;
using System.Collections;

namespace Application.Compilers;

public class CompilationContext
{
    public Dictionary<string, Point3D> Points { get; set; } = new Dictionary<string, Point3D>();
    public Dictionary<string, string> PointAliases { get; set; } = new();
    public FullValidationReport? ValidationReport { get; set; }
    public double UnitLength { get; set; } = 5.0; 

    public HashSet<string> IdentityPoints { get; set; } = new();

    // Cross-section (Lát cắt)
    public ClippingPlaneEquation? ClippingPlane { get; set; }
    public List<string> CrossSectionPoints { get; set; } = new();
    public Dictionary<string, PointSide> PointSides { get; set; } = new();

    public Point3D? GetPoint(string name)
    {
        return Points.TryGetValue(name, out var point) ? point : null;
    }

    public List<Point3D> GetPointsFromPlane(string planeName)
    {
        var result = new List<Point3D>();
        planeName = planeName.Replace("(", "").Replace(")", "");
        var vertices = System.Text.RegularExpressions.Regex.Matches(planeName, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();

        foreach (string v in vertices)
        {
            if (Points.TryGetValue(v, out var p))
                result.Add(p);
        }
        return result;
    }

    public Line3D? GetLine(string name)
    {
        var vertices = System.Text.RegularExpressions.Regex.Matches(name, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        if (vertices.Count < 2) return null;
        var p1 = GetPoint(vertices[0]);
        var p2 = GetPoint(vertices[1]);
        if (p1 != null && p2 != null) return new Line3D(p1, p2);
        return null;
    }

    public Plane3D? GetPlane(string name)
    {
        var vertices = System.Text.RegularExpressions.Regex.Matches(name, @"[A-Z][0-9]*'*").Cast<System.Text.RegularExpressions.Match>().Select(m => m.Value).ToList();
        if (vertices.Count < 3) return null;
        var p1 = GetPoint(vertices[0]);
        var p2 = GetPoint(vertices[1]);
        var p3 = GetPoint(vertices[2]);
        if (p1 != null && p2 != null && p3 != null) return new Plane3D(p1, p2, p3);
        return null;
    }

    public List<CircleData> Circles { get; set; } = new();
    public List<SphereData> Spheres { get; set; } = new();
    public HashSet<string> GeneratedSegments { get; set; } = new();
    public List<PlaneData> GeneratedPlanes { get; set; } = new();

    public void AddGeneratedSegment(string p1, string p2)
    {
        var s = string.Join("-", new[] { p1, p2 }.OrderBy(c => c));
        GeneratedSegments.Add(s);
    }

    public void ReplacePointReference(string oldName, string newName)
    {
        if (oldName == newName) return;

        // Identity Protection: Do not merge two identity points
        if (IdentityPoints.Contains(oldName.ToUpper()) && IdentityPoints.Contains(newName.ToUpper()))
        {
            return;
        }

        PointAliases[oldName] = newName;

        // 1. Segments
        var segmentsToUpdate = GeneratedSegments.Where(s => s.Contains(oldName)).ToList();
        foreach (var s in segmentsToUpdate)
        {
            GeneratedSegments.Remove(s);
            var parts = s.Split('-').Select(p => p == oldName ? newName : p).OrderBy(p => p);
            GeneratedSegments.Add(string.Join("-", parts));
        }

        // 2. Planes
        foreach (var plane in GeneratedPlanes)
        {
            for (int i = 0; i < plane.Points.Length; i++)
            {
                if (plane.Points[i] == oldName) plane.Points[i] = newName;
            }
        }

        // 3. Circles
        foreach (var circle in Circles)
        {
            if (circle.Center == oldName) circle.Center = newName;
        }

        // 4. Spheres
        foreach (var sphere in Spheres)
        {
            if (sphere.Center == oldName) sphere.Center = newName;
        }
    }
}

public class PlaneData { public string[] Points { get; set; } = Array.Empty<string>(); public string Color { get; set; } = "#6671d1"; public int Density { get; set; } = 15; public double Opacity { get; set; } = 0.2; }
public class CircleData { public string Center { get; set; } = ""; public double Radius { get; set; } public double[] Normal { get; set; } = { 0, 0, 1 }; public string Color { get; set; } = "#22B14C"; }
public class SphereData { public string Center { get; set; } = ""; public double Radius { get; set; } public string Color { get; set; } = "#6671d1"; public double Opacity { get; set; } = 0.1; }

public class ClippingPlaneEquation
{
    public double A { get; set; }
    public double B { get; set; }
    public double C { get; set; }
    public double D { get; set; }
    public string[] CrossSectionVertices { get; set; } = Array.Empty<string>();
}

public enum PointSide
{
    Above,
    Below,
    OnPlane
}