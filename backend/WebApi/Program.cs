using Application.Interfaces;
using Infrastructure.ExternalAPIs;
using Application.Compilers;
using Application.Compilers.FactHandlers;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
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

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
