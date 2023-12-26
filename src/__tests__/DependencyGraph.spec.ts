import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe } from '@jest/globals';
import type { Metafile } from 'esbuild';
import { faker } from '@faker-js/faker';
import { DependencyGraph } from '../DependencyGraph';
import type { ModuleId, ModuleIdMap } from '../types';

const ENTRY_POINT = 'index.js';
const TEST_MODULE = 'src/screens/MainScreen.tsx';

beforeAll(() => {
  // noop
  console.warn = () => undefined;
});

describe('DependencyGraph', () => {
  let metafile: Metafile;
  let graph: DependencyGraph;

  beforeAll(async () => {
    metafile = JSON.parse(
      await readFile(join(__dirname, './fixtures/metafile.json'), 'utf-8'),
    ) as Metafile;
    graph = new DependencyGraph(metafile, ENTRY_POINT);
  });

  describe('getModuleId', () => {
    describe('when trying to get a module id that does not exist', () => {
      it('should returns `null`', () => {
        expect(graph.getModuleId('-')).toBeNull();
      });
    });

    describe('when trying to get a module id that exist', () => {
      let modulePath: string;
      let moduleId: ModuleId;

      beforeEach(() => {
        modulePath = faker.helpers.arrayElement(Object.keys(metafile.inputs));
        moduleId = graph.getModuleId(modulePath)!;
      });

      it('should returns expected module', () => {
        expect(moduleId).not.toBeNull();
        expect(typeof moduleId === 'number').toEqual(true);
      });

      describe('when trying to get module by `moduleId`', () => {
        it('should returns expected module', () => {
          expect(graph.getModuleById(moduleId)?.path).toEqual(modulePath);
        });
      });
    });
  });

  describe('getModuleIdMap', () => {
    let modulePath: string;
    let moduleId: ModuleId;
    let moduleMap: ModuleIdMap;

    beforeEach(() => {
      modulePath = faker.helpers.arrayElement(Object.keys(metafile.inputs));
      moduleId = graph.getModuleId(modulePath)!;
      moduleMap = graph.getModuleIdMap();
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

  describe('dependenciesOf', () => {
    let moduleId: ModuleId;

    beforeEach(() => {
      moduleId = graph.getModuleId(TEST_MODULE)!;
    });

    it('should match snapshot', () => {
      expect(graph.dependenciesOf(moduleId)).toMatchSnapshot();
    });
  });

  describe('inverseDependenciesOf', () => {
    let moduleId: ModuleId;

    beforeEach(() => {
      moduleId = graph.getModuleId(TEST_MODULE)!;
    });

    it('should match snapshot', () => {
      expect(graph.inverseDependenciesOf(moduleId)).toMatchSnapshot();
    });
  });
});
