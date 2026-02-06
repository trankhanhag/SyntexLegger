# Contributing to SyntexLegger

Thank you for your interest in contributing to SyntexLegger! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- SQLite (development) or PostgreSQL (production)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/your-org/SyntexLegger.git
cd SyntexLegger
```

2. **Install dependencies**
```bash
# Backend
cd server
npm install

# Frontend
cd ../app
npm install
```

3. **Set up environment**
```bash
# Copy environment template
cp server/.env.example server/.env
# Edit .env with your settings
```

4. **Run development servers**
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd app && npm run dev
```

## Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages
Follow conventional commits format:
```
type(scope): description

feat(voucher): add void voucher functionality
fix(reports): correct trial balance calculation
docs(api): update authentication documentation
refactor(services): extract voucher validation
test(integration): add accounting flow tests
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

## Code Style

### TypeScript/JavaScript
- Use TypeScript for new code
- Follow existing patterns in the codebase
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### React Components
```tsx
// Prefer functional components with hooks
export const VoucherList: React.FC<Props> = ({ onSelect }) => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);

    // Use meaningful state names
    // Keep components focused and small
    // Extract logic to custom hooks when appropriate

    return (
        <div className="voucher-list">
            {/* ... */}
        </div>
    );
};
```

### Backend Services
```typescript
// Follow the service/repository pattern
class VoucherService {
    private repository: VoucherRepository;

    // Public methods for business operations
    async createVoucher(dto: CreateVoucherDTO): Promise<VoucherWithItems> {
        // 1. Validate input
        this.validateVoucherData(dto);

        // 2. Apply business rules
        const balance = this.checkVoucherBalance(dto.items);

        // 3. Persist data
        return this.repository.create(dto);
    }

    // Private methods for internal logic
    private validateVoucherData(dto: CreateVoucherDTO): void {
        // ...
    }
}
```

## Testing

### Running Tests
```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Specific file
npm test -- voucher.test

# Watch mode
npm test -- --watch
```

### Writing Tests
```typescript
describe('VoucherService', () => {
    describe('checkVoucherBalance', () => {
        it('should return balanced for equal debit and credit', () => {
            const items = [
                { debit_acc: '111', amount: 1000000 },
                { credit_acc: '511', amount: 1000000 },
            ];

            const result = service.checkVoucherBalance(items);

            expect(result.isBalanced).toBe(true);
            expect(result.totalDebit).toBe(1000000);
        });
    });
});
```

### Test Categories
- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test complete workflows
- **API Tests**: Test HTTP endpoints

## Vietnamese Accounting Standards

When working on accounting logic, ensure compliance with:
- **TT 99/2025**: Enterprise Accounting Standards
- Double-entry bookkeeping rules
- Vietnamese chart of accounts structure

### Account Code Structure
```
1xx - Tài sản ngắn hạn (Short-term assets)
2xx - Tài sản dài hạn (Long-term assets)
3xx - Nợ phải trả (Liabilities)
4xx - Vốn chủ sở hữu (Equity)
5xx - Doanh thu (Revenue)
6xx - Chi phí (Expenses)
7xx - Thu nhập khác (Other income)
8xx - Chi phí khác (Other expenses)
0xx - Ngoại bảng (Off-balance sheet)
```

### Double-Entry Rule
Every transaction must satisfy:
```
Sum(Debit amounts) = Sum(Credit amounts)
```

## Pull Request Process

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature
```

2. **Make your changes**
- Write code
- Add tests
- Update documentation

3. **Run tests locally**
```bash
npm test
```

4. **Commit and push**
```bash
git add .
git commit -m "feat(scope): description"
git push origin feature/your-feature
```

5. **Create Pull Request**
- Fill in the PR template
- Link related issues
- Request review

### PR Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] Accounting logic reviewed (if applicable)
- [ ] No sensitive data exposed

## Issue Reporting

### Bug Reports
Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details

### Feature Requests
Include:
- Clear description of the feature
- Use case / business value
- Proposed implementation (optional)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Questions?

- Open an issue for questions
- Check existing documentation
- Review similar code in the codebase

Thank you for contributing to SyntexLegger!
