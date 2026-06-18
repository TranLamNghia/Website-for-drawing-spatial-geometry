# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /app

# Copy solution and project files
COPY SpatialGeometry.sln ./
COPY WebApi/WebApi.csproj WebApi/
COPY Application/Application.csproj Application/
COPY Infrastructure/Infrastructure.csproj Infrastructure/
COPY Domains/Domains.csproj Domains/

# Restore dependencies
RUN dotnet restore

# Copy all source files and publish
COPY . ./
RUN dotnet publish WebApi/WebApi.csproj -c Release -o out

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build-env /app/out .

EXPOSE 5000

CMD ["sh", "-c", "dotnet WebApi.dll --urls http://+:${PORT:-5000}"]
