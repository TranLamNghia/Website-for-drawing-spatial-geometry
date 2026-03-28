using Application.Interfaces;
using Infrastructure.ExternalAPIs;
using Application.Compilers;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

builder.Services.AddScoped<IGeometryExtractionService, GeometryExtractionService>();
builder.Services.AddScoped<IGeometryCompiler, GeometryCompiler>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
