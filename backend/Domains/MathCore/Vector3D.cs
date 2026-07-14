using System;

namespace Domains.MathCore;

public class Vector3D
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Z { get; set; }

    public Vector3D(double x, double y, double z)
    {
        X = x;
        Y = y;
        Z = z;
    }

    public Vector3D(Point3D from, Point3D to)
    {
        X = to.X - from.X;
        Y = to.Y - from.Y;
        Z = to.Z - from.Z;
    }

    // Length of the vector
    public double Magnitude()
    {
        return Math.Sqrt(X * X + Y * Y + Z * Z);
    }

    // Dot product — used to compute angles
    public double DotProduct(Vector3D other)
    {
        return (X * other.X) + (Y * other.Y) + (Z * other.Z);
    }

    // Cross product — yields a vector perpendicular to both operands
    public Vector3D CrossProduct(Vector3D other)
    {
        return new Vector3D(
            (Y * other.Z) - (Z * other.Y),
            (Z * other.X) - (X * other.Z),
            (X * other.Y) - (Y * other.X)
        );
    }

    // Angle between two vectors (returns degrees)
    public double AngleWith(Vector3D other)
    {
        double dot = this.DotProduct(other);
        double mags = this.Magnitude() * other.Magnitude();
        if (mags < 1e-9) return 0;
        
        return Math.Acos(dot / mags) * (180.0 / Math.PI);
    }

    // Operator overloads for more concise C# code
    public static Vector3D operator +(Vector3D v1, Vector3D v2) => new(v1.X + v2.X, v1.Y + v2.Y, v1.Z + v2.Z);
    public static Vector3D operator -(Vector3D v1, Vector3D v2) => new(v1.X - v2.X, v1.Y - v2.Y, v1.Z - v2.Z);
    public static Vector3D operator *(Vector3D v, double scalar) => new(v.X * scalar, v.Y * scalar, v.Z * scalar);

    // Scalar triple product (for tetrahedron volume or coplanarity checks)
    public double MixedProduct(Vector3D v2, Vector3D v3)
    {
        return this.CrossProduct(v2).DotProduct(v3);
    }

    // Interior angle bisector direction from two vectors sharing a common vertex
    public Vector3D GetBisectorVector(Vector3D other)
    {
        var v1_norm = this.Normalize();
        var v2_norm = other.Normalize();
        // Sum of unit vectors gives the rhombus diagonal — the angle bisector
        return v1_norm + v2_norm; 
    }

    // Returns a unit vector in the same direction (length = 1)
    public Vector3D Normalize()
    {
        double mag = Magnitude();
        if (mag < 1e-9) return new Vector3D(0, 0, 0);
        return new Vector3D(X / mag, Y / mag, Z / mag);
    }
}
