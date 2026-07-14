using System;

namespace Domains.MathCore;

public class Line3D
{
    public Point3D Point { get; set; }
    public Vector3D Direction { get; set; }

    public Line3D(Point3D point, Vector3D direction)
    {
        if (direction.Magnitude() < 1e-9)
            throw new ArgumentException("Direction vector cannot be 0 (null).");
            
        Point = point;
        Direction = direction;
    }

    public Line3D(Point3D p1, Point3D p2)
    {
        var dir = new Vector3D(p1, p2);
        if (dir.Magnitude() < 1e-9)
            throw new ArgumentException("2 points are the same, cannot create a line.");
            
        Point = p1;
        Direction = dir;
    }

    // Distance from the line to a point
    public double DistanceToPoint(Point3D point)
    {
        var v = new Vector3D(Point, point);
        var cross = v.CrossProduct(Direction);
        return cross.Magnitude() / Direction.Magnitude();
    }
 
    // Projection of a point onto the line
    public Point3D GetProjection(Point3D point)
    {
        var ap = new Vector3D(Point, point);
        double t = ap.DotProduct(Direction) / Direction.DotProduct(Direction);
 
        return new Point3D(
            Point.X + Direction.X * t,
            Point.Y + Direction.Y * t,
            Point.Z + Direction.Z * t
        );
    }

    // Distance between two lines
    public double DistanceToLine(Line3D other)
    {        
        var cross = Direction.CrossProduct(other.Direction);
        
        // Cross product ≈ 0: lines are parallel (or coincident)
        if (cross.Magnitude() < 1e-9)
        {
            // Reduce to point-to-line distance from the other line's anchor point
            return DistanceToPoint(other.Point); 
        }
                
        var v = new Vector3D(Point, other.Point);
        return Math.Abs(v.DotProduct(cross)) / cross.Magnitude();
    }

    // Intersection of two lines
    public Point3D? IntersectWith(Line3D other, bool isSegment = false)
    {
        var p1 = this.Point;
        var p2 = other.Point;
        var d1 = this.Direction;
        var d2 = other.Direction;

        // Vector between the two anchor points
        var w = new Vector3D(p2, p1); 

        // Coefficients for solving the system (parameters t1, t2)
        double a = d1.DotProduct(d1);
        double b = d1.DotProduct(d2);
        double c = d2.DotProduct(d2);
        double d = d1.DotProduct(w);
        double e = d2.DotProduct(w);

        double denominator = a * c - b * b;

        // Denominator ≈ 0: lines are parallel
        if (Math.Abs(denominator) < 1e-9)
            return null; 

        double t1 = (b * e - c * d) / denominator;
        double t2 = (a * e - b * d) / denominator;

        // Intersection point on line 1
        var p1_intersect = new Point3D(
            p1.X + d1.X * t1,
            p1.Y + d1.Y * t1,
            p1.Z + d1.Z * t1
        );

        // Intersection point on line 2
        var p2_intersect = new Point3D(
            p2.X + d2.X * t2,
            p2.Y + d2.Y * t2,
            p2.Z + d2.Z * t2
        );

        // In 3D, verify both points coincide (tolerance 1e-6)
        if (p1_intersect.DistanceToPoint(p2_intersect) > 1e-6)
            return null; // Skew lines — closest points do not coincide

        // For segments, t1 and t2 must lie in [0, 1]
        if (isSegment)
        {
            if (t1 < -1e-6 || t1 > 1 + 1e-6 || t2 < -1e-6 || t2 > 1 + 1e-6)
                return null; // Intersection lies on extensions, not on the segments
        }

        return p1_intersect;
    }

    // Angle between two lines (always ≤ 90°)
    public double AngleWith(Line3D other)
    {
        double dot = Math.Abs(this.Direction.DotProduct(other.Direction));
        double mags = this.Direction.Magnitude() * other.Direction.Magnitude();
        if (mags < 1e-9) return 0;
        return Math.Acos(dot / mags) * (180.0 / Math.PI);
    }

    // String representation of the parametric line
    public override string ToString()
    {
        string FormatParam(double p, double d)
        {
            if (Math.Abs(d) < 1e-6) return $"{Math.Round(p, 2)}";
            string pStr = Math.Abs(p) > 1e-6 ? $"{Math.Round(p, 2)} " : "";
            string sign = d > 0 && Math.Abs(p) > 1e-6 ? "+ " : (d < 0 ? "- " : "");
            string dStr = Math.Abs(Math.Abs(d) - 1) < 1e-6 ? "t" : $"{Math.Abs(Math.Round(d, 2))}t";
            return $"{pStr}{sign}{dStr}".Trim();
        }

        return $"[x = {FormatParam(Point.X, Direction.X)}; " +
               $"y = {FormatParam(Point.Y, Direction.Y)}; " +
               $"z = {FormatParam(Point.Z, Direction.Z)}]";
    }
}
