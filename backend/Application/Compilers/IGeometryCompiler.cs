using Application.DTOs;

namespace Application.Compilers;

public interface IGeometryCompiler
{
    CompilationContext Compile(GeometryProblemDto problem);
}