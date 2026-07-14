using System;

namespace Domains.MathCore;

public class Plane3D
{
    public double A { get; set; }
    public double B { get; set; }
    public double C { get; set; }
    public double D { get; set; }

    public Vector3D Normal => new Vector3D(A, B, C);

    public Plane3D(Point3D point, Vector3D normal)
    {
        A = normal.X;
        B = normal.Y;
        C = normal.Z;
        D = -(A * point.X + B * point.Y + C * point.Z);
    }

    public Plane3D(double a, double b, double c, double d)
    {
        A = a;
        B = b;
        C = c;
        D = d;
    }

    public Plane3D(Point3D p1, Point3D p2, Point3D p3)
    {
        var v1 = new Vector3D(p1, p2);
        var v2 = new Vector3D(p1, p3);
        
        var normal = v1.CrossProduct(v2);

        if (normal.Magnitude() < 1e-9)
            throw new ArgumentException("3 point are collinear, cannot create a plane");

        A = normal.X;
        B = normal.Y;
        C = normal.Z;
        D = -(A * p1.X + B * p1.Y + C * p1.Z);
    }

    // Distance from the plane to a point
    public double DistanceToPoint(Point3D point)
    {
        return Math.Abs(A * point.X + B * point.Y + C * point.Z + D) / Normal.Magnitude();
    }

    // Distance from the plane to a line
    public double DistanceToLine(Line3D line)
    {
        // Check angle between line direction and plane normal
        // Dot product ≈ 0: line is parallel to or lies in the plane
        double dot = Normal.DotProduct(line.Direction);
        
        if (Math.Abs(dot) < 1e-9) 
        {
            return DistanceToPoint(line.Point);
        }
        
        return 0; // Line intersects the plane (distance = 0)
    }

    // Distance between two planes
    public double DistanceToPlane(Plane3D other)
    {
        // Check whether the normals are parallel
        var cross = this.Normal.CrossProduct(other.Normal);
        
        if (cross.Magnitude() < 1e-9)
        {
            // Pick any point P on the other plane
            Point3D p;
            if (Math.Abs(other.A) > 1e-9) p = new Point3D(-other.D / other.A, 0, 0);
            else if (Math.Abs(other.B) > 1e-9) p = new Point3D(0, -other.D / other.B, 0);
            else p = new Point3D(0, 0, -other.D / other.C);

            return this.DistanceToPoint(p);
        }

        return 0; // Planes intersect (distance = 0)
    }

    // Line of intersection of two planes (returns a Line3D)
    public Line3D? IntersectWith(Plane3D other)
    {
        // Direction of intersection = cross product of the two normals
        var direction = this.Normal.CrossProduct(other.Normal);

        // Cross product ≈ 0: planes are parallel or coincident
        if (direction.Magnitude() < 1e-9)
            return null;

        // Find a point on the intersection by solving the system
        // Try setting one of x, y, or z to zero in turn
        double x = 0, y = 0, z = 0;
        double detXY = this.A * other.B - this.B * other.A;
        double detYZ = this.B * other.C - this.C * other.B;
        double detZX = this.C * other.A - this.A * other.C;

        if (Math.Abs(detXY) > 1e-9)
        {
            x = (this.B * other.D - other.B * this.D) / detXY;
            y = (other.A * this.D - this.A * other.D) / detXY;
            z = 0;
        }
        else if (Math.Abs(detYZ) > 1e-9)
        {
            x = 0;
            y = (this.C * other.D - other.C * this.D) / detYZ;
            z = (other.B * this.D - this.B * other.D) / detYZ;
        }
        else
        {
            x = (other.C * this.D - this.C * other.D) / detZX;
            y = 0;
            z = (this.A * other.D - other.A * this.D) / detZX;
        }

        return new Line3D(new Point3D(x, y, z), direction);
    }

    // Intersection of the plane and a line
    public Point3D? IntersectWith(Line3D line)
    {
        double denominator = A * line.Direction.X + B * line.Direction.Y + C * line.Direction.Z;
        
        if (Math.Abs(denominator) < 1e-9) 
            return null;

        double numerator = -(A * line.Point.X + B * line.Point.Y + C * line.Point.Z + D);
        double t = numerator / denominator;

        return new Point3D(
            line.Point.X + line.Direction.X * t,
            line.Point.Y + line.Direction.Y * t,
            line.Point.Z + line.Direction.Z * t
        );
    }
    
    // Projection of a point onto the plane
    public Point3D GetProjection(Point3D point)
    {
        double t = -(A * point.X + B * point.Y + C * point.Z + D) / (A * A + B * B + C * C);
        return new Point3D(point.X + A * t, point.Y + B * t, point.Z + C * t);
    }

    // Angle between two planes
    public double AngleWithPlane(Plane3D other)
    {
        double dot = Math.Abs(this.Normal.DotProduct(other.Normal));
        double mags = this.Normal.Magnitude() * other.Normal.Magnitude();
        if (mags < 1e-9) return 0;
        return Math.Acos(dot / mags) * (180.0 / Math.PI);
    }

    // Angle between a plane and a line
    public double AngleWithLine(Line3D line)
    {
        double dot = Math.Abs(this.Normal.DotProduct(line.Direction));
        double mags = this.Normal.Magnitude() * line.Direction.Magnitude();
        if (mags < 1e-9) return 0;
        return Math.Asin(dot / mags) * (180.0 / Math.PI); // Use Asin instead of Acos
    }

    // Perpendicular bisector plane of a segment
    public static Plane3D CreatePerpendicularBisector(Point3D p1, Point3D p2)
    {
        var midpoint = p1.GetMidpoint(p2);
        var normal = new Vector3D(p1, p2);
        return new Plane3D(midpoint, normal);
    }

    // String representation of the plane equation
    public override string ToString()
    {
        var parts = new System.Collections.Generic.List<string>();
        
        // Pretty-print coefficients: omit zeros, hide ±1, handle signs
        if (Math.Abs(A) > 1e-6) parts.Add(A == 1 ? "x" : A == -1 ? "-x" : $"{Math.Round(A, 2)}x");
        if (Math.Abs(B) > 1e-6) parts.Add(B == 1 ? "y" : B == -1 ? "-y" : $"{Math.Round(B, 2)}y");
        if (Math.Abs(C) > 1e-6) parts.Add(C == 1 ? "z" : C == -1 ? "-z" : $"{Math.Round(C, 2)}z");
        
        string equation = string.Join(" + ", parts).Replace("+ -", "- ");
        
        if (Math.Abs(D) > 1e-6)
            equation += (D > 0 ? " + " : " - ") + Math.Abs(Math.Round(D, 2));
            
        return string.IsNullOrEmpty(equation) ? "0 = 0" : equation + " = 0";
    }
}
