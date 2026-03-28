using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShapeType
{
    Triangle,
    Equilateral_triangle,
    Isosceles_triangle,
    Right_triangle,
    Isosceles_right_triangle,
    Square,
    Rectangle,
    Rhombus,
    Parallelogram,
    Trapezoid,
    Circle,
    Sphere,
    Pyramid,
    Prism,
    Tetrahedron,
    Cube,
    Rectangular_cuboid,
    Cylinder,
    Cone,
    Torus,
    Regular_pyramid,
    Regular_prism,
    Regular_tetrahedron,
    Regular_cube,
    Regular_rectangular_cuboid,
    Regular_parallelepiped,
    Regular_cylinder,
    Regular_cone,
    Regular_sphere,
    Regular_torus
}
