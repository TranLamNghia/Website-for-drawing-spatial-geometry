using Application.DTOs;

namespace Application.Compilers;

public interface IGeometryCompiler
{
    CompilationContext Compile(GeometryProblemDto problem);
    void RefineWithNewPoints(CompilationContext context, GeometryProblemDto problem, Dictionary<string, Domains.MathCore.Point3D> newPoints);
}