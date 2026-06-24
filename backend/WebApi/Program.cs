using Application.Interfaces;
using Infrastructure.ExternalAPIs;
using Application.Compilers;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;
using Application.Compilers.QueryHandlers;
using Application.Compilers.QueryValidators;
using WebApi.Diagnostics;

if (string.Equals(Environment.GetEnvironmentVariable("RUN_BATCH2_SMOKETESTS"), "1", StringComparison.OrdinalIgnoreCase))
{
    Batch2SmokeTests.Run();
    return;
}

if (string.Equals(Environment.GetEnvironmentVariable("RUN_BATCH1_SMOKETESTS"), "1", StringComparison.OrdinalIgnoreCase))
{
    Batch1SmokeTests.Run();
    return;
}

if (string.Equals(Environment.GetEnvironmentVariable("RUN_BATCH3_SMOKETESTS"), "1", StringComparison.OrdinalIgnoreCase))
{
    Batch3SmokeTests.Run();
    return;
}

if (string.Equals(Environment.GetEnvironmentVariable("RUN_BATCH4_SMOKETESTS"), "1", StringComparison.OrdinalIgnoreCase))
{
    Batch4SmokeTests.Run();
    return;
}

if (string.Equals(Environment.GetEnvironmentVariable("RUN_BATCH5_SMOKETESTS"), "1", StringComparison.OrdinalIgnoreCase))
{
    Batch5SmokeTests.Run();
    return;
}

if (string.Equals(Environment.GetEnvironmentVariable("RUN_BATCH6_SMOKETESTS"), "1", StringComparison.OrdinalIgnoreCase))
{
    Batch6SmokeTests.Run();
    return;
}

var builder = WebApplication.CreateBuilder(args);

// Load .env file from root directory
var rootDir = Directory.GetCurrentDirectory();
while (rootDir != null && !File.Exists(Path.Combine(rootDir, ".env")))
{
    rootDir = Directory.GetParent(rootDir)?.FullName;
}
if (rootDir != null)
{
    DotNetEnv.Env.Load(Path.Combine(rootDir, ".env"));
    builder.Configuration.AddEnvironmentVariables();
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder =>
        {
            builder.AllowAnyOrigin()
                   .AllowAnyMethod()
                   .AllowAnyHeader();
        });
});
builder.Services.AddHttpClient<IGeometryExtractionService, GeometryExtractionService>(client => 
{
    client.Timeout = TimeSpan.FromMinutes(3); // Tăng timeout từ 100s (mặc định) lên 3 phút
});
builder.Services.AddScoped<IGeometryCompiler, GeometryCompiler>();

builder.Services.AddScoped<IFactHandler, MidpointHandler>();
builder.Services.AddScoped<IFactHandler, CentroidHandler>();
builder.Services.AddScoped<IFactHandler, IntersectionHandler>();
builder.Services.AddScoped<IFactHandler, ProjectionHandler>();
builder.Services.AddScoped<IFactHandler, RatioHandler>();
builder.Services.AddScoped<IFactHandler, BelongsToHandler>();
builder.Services.AddScoped<IFactHandler, CircumcenterHandler>();
builder.Services.AddScoped<IFactHandler, IncenterHandler>();
builder.Services.AddScoped<IFactHandler, OrthocenterHandler>();
builder.Services.AddScoped<IFactHandler, CircumscribedHandler>();
builder.Services.AddScoped<IFactHandler, InscribedHandler>();
builder.Services.AddScoped<IFactHandler, ParallelHandler>();
builder.Services.AddScoped<IFactHandler, PerpendicularHandler>();
builder.Services.AddScoped<IFactHandler, AngleHandler>();
builder.Services.AddScoped<IFactHandler, LengthHandler>();
builder.Services.AddScoped<IFactHandler, OppositeRayHandler>();
builder.Services.AddScoped<IFactHandler, RayHandler>();
builder.Services.AddScoped<IFactHandler, PerpendicularRayHandler>();
builder.Services.AddScoped<IFactHandler, AngleBisectorHandler>();
builder.Services.AddScoped<IFactHandler, ShapeHandler>();
builder.Services.AddScoped<IFactHandler, AreaHandler>();
builder.Services.AddScoped<IFactHandler, PerimeterHandler>();
builder.Services.AddScoped<IFactHandler, VolumeHandler>();
builder.Services.AddScoped<IFactHandler, DistanceHandler>();
builder.Services.AddScoped<IFactHandler, EqualityHandler>();
builder.Services.AddScoped<IFactHandler, CoplanarHandler>();
builder.Services.AddScoped<IFactHandler, CollinearHandler>();
builder.Services.AddScoped<IFactHandler, TangentHandler>();

// Đăng ký FactValidators (Kiểm định ngược tọa độ)
builder.Services.AddScoped<IFactValidator, LengthValidator>();
builder.Services.AddScoped<IFactValidator, AreaValidator>();
builder.Services.AddScoped<IFactValidator, DistanceValidator>();
builder.Services.AddScoped<IFactValidator, AngleValidator>();
builder.Services.AddScoped<IFactValidator, ParallelValidator>();
builder.Services.AddScoped<IFactValidator, PerpendicularValidator>();
builder.Services.AddScoped<IFactValidator, CentroidValidator>();
builder.Services.AddScoped<IFactValidator, MidpointValidator>();
builder.Services.AddScoped<IFactValidator, ProjectionValidator>();
builder.Services.AddScoped<IFactValidator, RatioValidator>();
builder.Services.AddScoped<IFactValidator, ShapeValidator>();
builder.Services.AddScoped<IFactValidator, CircumcenterValidator>();
builder.Services.AddScoped<IFactValidator, IncenterValidator>();
builder.Services.AddScoped<IFactValidator, OrthocenterValidator>();
builder.Services.AddScoped<IFactValidator, CircumscribedValidator>();
builder.Services.AddScoped<IFactValidator, InscribedValidator>();
builder.Services.AddScoped<IFactValidator, PerimeterValidator>();
builder.Services.AddScoped<IFactValidator, VolumeValidator>();
builder.Services.AddScoped<IFactValidator, EqualityValidator>();
builder.Services.AddScoped<IFactValidator, CoplanarValidator>();
builder.Services.AddScoped<IFactValidator, CollinearValidator>();
builder.Services.AddScoped<IFactValidator, BelongsToValidator>();
builder.Services.AddScoped<IFactValidator, TangentValidator>();
builder.Services.AddScoped<FactValidationEngine>();

builder.Services.AddScoped<IQueryHandler, ShapeQueryHandler>();
builder.Services.AddScoped<IQueryHandler, IntersectionLineQueryHandler>();
builder.Services.AddScoped<IQueryHandler, EquationLineQueryHandler>();
builder.Services.AddScoped<IQueryHandler, EquationPlaneQueryHandler>();
builder.Services.AddScoped<IQueryHandler, EquationSphereQueryHandler>();
builder.Services.AddScoped<IQueryHandler, CoordinatesQueryHandler>();
builder.Services.AddScoped<IQueryHandler, LocusQueryHandler>();
builder.Services.AddScoped<IQueryHandler, ProofParallelQueryHandler>();
builder.Services.AddScoped<IQueryHandler, ProofPerpendicularQueryHandler>();
builder.Services.AddScoped<IQueryHandler, ProofEqualQueryHandler>();
builder.Services.AddScoped<IQueryHandler, CosineBetweenPlanesQueryHandler>();
builder.Services.AddScoped<IQueryHandler, SineBetweenLineAndPlaneQueryHandler>();
builder.Services.AddScoped<IQueryHandler, RatioVolumeQueryHandler>();

builder.Services.AddScoped<IQueryValidator, ShapeQueryValidator>();
builder.Services.AddScoped<IQueryValidator, IntersectionLineQueryValidator>();
builder.Services.AddScoped<IQueryValidator, EquationLineQueryValidator>();
builder.Services.AddScoped<IQueryValidator, EquationPlaneQueryValidator>();
builder.Services.AddScoped<IQueryValidator, EquationSphereQueryValidator>();
builder.Services.AddScoped<IQueryValidator, CoordinatesQueryValidator>();
builder.Services.AddScoped<IQueryValidator, LocusQueryValidator>();
builder.Services.AddScoped<IQueryValidator, ProofParallelQueryValidator>();
builder.Services.AddScoped<IQueryValidator, ProofPerpendicularQueryValidator>();
builder.Services.AddScoped<IQueryValidator, ProofEqualQueryValidator>();
builder.Services.AddScoped<IQueryValidator, CosineBetweenPlanesQueryValidator>();
builder.Services.AddScoped<IQueryValidator, SineBetweenLineAndPlaneQueryValidator>();
builder.Services.AddScoped<IQueryValidator, RatioVolumeQueryValidator>();
builder.Services.AddScoped<QueryProcessingEngine>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
