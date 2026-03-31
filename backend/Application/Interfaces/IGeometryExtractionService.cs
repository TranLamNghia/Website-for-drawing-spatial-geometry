using Application.DTOs;
using Domains.MathCore;

namespace Application.Interfaces;

public interface IGeometryExtractionService
{
    Task<GeometryProblemDto?> ExtractGeometryAsync(string problemText);
    Task<Dictionary<string, Point3D>?> FallbackSolveMathAsync(MathSolverRequestDto request);
}