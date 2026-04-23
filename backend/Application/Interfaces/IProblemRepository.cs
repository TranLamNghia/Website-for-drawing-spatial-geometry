using Domains.Entities;

namespace Application.Interfaces
{
    public interface IProblemRepository
    {
        Task<Problem> GetByIdAsync(string id);
        Task<List<Problem>> GetByUserIdAsync(string userId);
        Task CreateAsync(Problem problem);
        Task UpdateAsync(string id, Problem problem);
        Task DeleteAsync(string id);
    }
}