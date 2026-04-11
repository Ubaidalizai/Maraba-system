# Dates Shop MIS - Frontend

This is the frontend application for the Dates Shop Management Information System.

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_BACKEND_BASE_URL=http://localhost:3001
```

### Production Setup

For production deployment, update the `.env` file with your production API URLs:

```env
# Production API Configuration
VITE_API_BASE_URL=https://your-api-domain.com/api/v1
VITE_BACKEND_BASE_URL=https://your-api-domain.com
```

**Note:** In Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
