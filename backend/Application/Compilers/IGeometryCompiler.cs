using Application.DTOs;

namespace Application.Compilers;

public interface IGeometryCompiler
{
    CompilationContext Compile(GeometryProblemDto problem);
    void RefineWithNewPoints(CompilationContext context, GeometryProblemDto problem, MathSolverResponseDto response);
}