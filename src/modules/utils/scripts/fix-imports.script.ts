import { Project } from 'ts-morph';
import path from 'path';

async function project() {
  try {
    const project = new Project({
      tsConfigFilePath: 'tsconfig.json',
    });

    const sourceFiles = project.getSourceFiles('src/**/*.ts');

    sourceFiles.forEach((sourceFile) => {
      const imports = sourceFile.getImportDeclarations();

      imports.forEach((imp) => {
        const moduleSpecifier = imp.getModuleSpecifierValue();

        if (moduleSpecifier.startsWith('src/')) {
          const sourceFilePath = sourceFile.getFilePath();
          const absPath = path.resolve(process.cwd(), moduleSpecifier);

          const relPath = path
            .relative(path.dirname(sourceFilePath), absPath)
            .replace(/\\/g, '/');

          const finalPath = relPath.startsWith('.') ? relPath : './' + relPath;
          imp.setModuleSpecifier(finalPath);
        }
      });
    });

    await project.save();
    console.log('✅ Imports updated to relative paths');
  } catch (error) {
    console.error('❌ Error while updating imports:', error);
    process.exit(1);
  }
}

void project();
