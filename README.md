# DeepGraph

Welcome to **DeepGraph**, a tool designed to convert research reports into interactive knowledge graphs.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [Scripts](#scripts)
- [Dependencies](#dependencies)
- [Deployment](#deployment)
- [License](#license)

## Introduction

DeepGraph is a web application built using Next.js 16 and React 19 with TypeScript. It allows users to transform static research reports into dynamic, interactive knowledge graphs, enhancing the way information is visualized and understood.

## Installation

To get started with DeepGraph, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd deepgraph
npm install
```

## Usage

To run the application locally, use the following command:

```bash
npm run dev
```

This will start the Next.js development server. You can then access the application at `http://localhost:3000`.

## Scripts

- **dev**: Starts the Next.js development server.
- **build**: Builds the application for production.
- **start**: Starts the production server.
- **lint**: Runs ESLint to check for code issues.

## Dependencies

### Runtime Dependencies
- **next**: ^16.0.6
- **react**: ^19.2.0
- **react-dom**: ^19.2.0
- **d3**: ^7.0.0 (for knowledge graph visualization)
- **firebase**: ^11.6.1 (for authentication)

### Dev Dependencies
- **typescript**: ^5
- **tailwindcss**: ^4
- **eslint**: ^9
- **eslint-config-next**: ^16.0.6

## Deployment

This project is configured for deployment on Vercel. The `vercel.json` file includes security headers and framework configuration.

To deploy:

1. Connect your repository to Vercel
2. Vercel will automatically detect the Next.js framework
3. Deploy with a single click

## License
This project is licensed under the MIT License.
