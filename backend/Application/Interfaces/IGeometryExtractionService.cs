using Application.DTOs;


namespace Application.Interfaces;

public interface IGeometryExtractionService
{
    Task<GeometryProblemDto?> ExtractGeometryAsync(string problemText);
}