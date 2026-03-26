using System.Text.Json.Serialization;

namespace Application.DTOs.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShapeType
{
    triangle,
    equilateral_triangle,
    isosceles_triangle,
    right_triangle,
    square,
    rectangle,
    rhombus,
    parallelogram,
    trapezoid,
    circle,
    sphere,
    pyramid,
    prism,
    tetrahedron,
    cube,
    rectangular_cuboid,
    cylinder,
    cone,
    torus,
    regular_pyramid,
    regular_prism,
    regular_tetrahedron,
    regular_cube,
    regular_rectangular_cuboid,
    regular_parallelepiped,
    regular_cylinder,
    regular_cone,
    regular_sphere,
    regular_torus
}
