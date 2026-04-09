using Application.Interfaces;
using Infrastructure.ExternalAPIs;
using Application.Compilers;
using Application.Compilers.FactHandlers;
using Application.Compilers.FactValidators;

var builder = WebApplication.CreateBuilder(args);

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

// Đăng ký FactValidators (Kiểm định ngược tọa độ)
builder.Services.AddScoped<IFactValidator, LengthValidator>();
builder.Services.AddScoped<IFactValidator, AreaValidator>();
builder.Services.AddScoped<IFactValidator, DistanceValidator>();
builder.Services.AddScoped<IFactValidator, AngleValidator>();
builder.Services.AddScoped<IFactValidator, CentroidValidator>();
builder.Services.AddScoped<IFactValidator, MidpointValidator>();
builder.Services.AddScoped<IFactValidator, ProjectionValidator>();
builder.Services.AddScoped<IFactValidator, ShapeValidator>();
builder.Services.AddScoped<IFactValidator, CircumcenterValidator>();
builder.Services.AddScoped<FactValidationEngine>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
