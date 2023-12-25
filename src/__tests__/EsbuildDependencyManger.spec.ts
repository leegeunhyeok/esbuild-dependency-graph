import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe } from '@jest/globals';
import type { Metafile } from 'esbuild';
import { faker } from '@faker-js/faker';
import { EsbuildDependencyManager } from '../DependencyGraph';
import type { ModuleId, ModuleMap, ModuleDependencyGraph } from '../types';

const ENTRY_POINT = 'index.js';
const TEST_MODULE = 'src/screens/MainScreen.tsx';

beforeAll(() => {
  // noop
  console.warn = () => undefined;
});

describe('EsbuildDependencyManager', () => {
  let metafile: Metafile;
  let dependencyManager: EsbuildDependencyManager;
  let moduleDependencyGraph: ModuleDependencyGraph;

  beforeAll(async () => {
    metafile = JSON.parse(
      await readFile(join(__dirname, './fixtures/metafile.json'), 'utf-8'),
    ) as Metafile;
    dependencyManager = new EsbuildDependencyManager(metafile, ENTRY_POINT);
    moduleDependencyGraph = dependencyManager.getDependencyGraph();
  });

  describe('getModuleId', () => {
    describe('when trying to get a module id that does not exist', () => {
      it('should returns `null`', () => {
        expect(dependencyManager.getModuleId('-')).toBeNull();
      });
    });

    describe('when trying to get a module id that exist', () => {
      let modulePath: string;
      let moduleId: ModuleId;

      beforeEach(() => {
        modulePath = faker.helpers.arrayElement(Object.keys(metafile.inputs));
        moduleId = dependencyManager.getModuleId(modulePath)!;
      });

      it('should returns expected module', () => {
        expect(moduleId).not.toBeNull();
        expect(typeof moduleId === 'number').toEqual(true);
      });

      describe('when trying to get module by `moduleId`', () => {
        it('should returns expected module', () => {
          expect(dependencyManager.getModuleById(moduleId)?.path).toEqual(
            modulePath,
          );
        });
      });
    });
  });

  describe('getModule', () => {
    describe('when trying to get a module that does not exist', () => {
      it('should returns `null`', () => {
        expect(dependencyManager.getModule('-')).toBeNull();
      });
    });

    describe('when trying to get a module that exist', () => {
      let modulePath: string;

      beforeEach(() => {
        modulePath = faker.helpers.arrayElement(Object.keys(metafile.inputs));
      });

      it('should returns expected module', () => {
        const module = dependencyManager.getModule(modulePath);
        expect(module).not.toBeNull();
        expect(module?.path).toEqual(modulePath);
      });
    });
  });

  describe('getModuleMap', () => {
    let modulePath: string;
    let moduleId: ModuleId;
    let moduleMap: ModuleMap;

    beforeEach(() => {
      modulePath = faker.helpers.arrayElement(Object.keys(metafile.inputs));
      moduleId = dependencyManager.getModuleId(modulePath)!;
      moduleMap = dependencyManager.getModuleMap();
    });

    it('should returns `ModuleMap` object', () => {
      expect(typeof moduleMap === 'object').toEqual(true);
    });

    describe('when access by module id to `ModuleMap`', () => {
      it('should be same as the expected module', () => {
        expect(moduleMap[moduleId].path).toEqual(modulePath);
      });
    });
  });

  describe('getDependencyGraph', () => {
    let modulePath: string;
    let moduleId: ModuleId;

    beforeEach(() => {
      modulePath = faker.helpers.arrayElement(Object.keys(metafile.inputs));
      moduleId = dependencyManager.getModuleId(modulePath)!;
    });

    it('should returns `ModuleDependencyGraph` object', () => {
      expect(typeof moduleDependencyGraph === 'object').toEqual(true);
    });

    describe('when access by module id to `ModuleDependencyGraph`', () => {
      it('should returns object that contains property `dependencies` with `Set` value', () => {
        expect(
          moduleDependencyGraph[moduleId].dependencies instanceof Set,
        ).toEqual(true);
      });

      it('should returns object that contains property `inverseDependencies` with `Set` value', () => {
        expect(
          moduleDependencyGraph[moduleId].inverseDependencies instanceof Set,
        ).toEqual(true);
      });

      it('should match snapshot', () => {
        const moduleId = dependencyManager.getModuleId(TEST_MODULE)!;
        expect(moduleDependencyGraph[moduleId]).toMatchSnapshot();
      });
    });
  });

  describe('getInverseDependencies', () => {
    let moduleId: ModuleId;

    beforeEach(() => {
      moduleId = dependencyManager.getModuleId(TEST_MODULE)!;
    });

    it('should match snapshot', () => {
      expect(
        dependencyManager.getInverseDependencies(moduleId),
      ).toMatchSnapshot();
    });
  });
});
