using Domains.Entities;

namespace Application.Interfaces;

public interface IJwtTokenService
{
    string CreateAccessToken(User user);
}
