import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe } from '@jest/globals';
import type { Metafile } from 'esbuild';
import { faker } from '@faker-js/faker';
import { DependencyGraph } from '../DependencyGraph';
import * as helpers from '../helpers';
import type { ModuleId } from '../types';

const ENTRY_POINT = 'index.js';
const TEST_MODULE = 'src/screens/MainScreen.tsx';
const EXTERNAL_MODULE = '<runtime>';

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
      it('should throw error', () => {
        expect(() => graph.getModuleId('asdasdasdasd-')).toThrow();
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
          expect(graph.getModule(moduleId).path).toEqual(modulePath);
        });
      });
    });
  });

  describe('dependenciesOf', () => {
    let moduleId: ModuleId;

    beforeAll(() => {
      moduleId = graph.getModuleId(TEST_MODULE)!;
    });

    it('should match snapshot', () => {
      expect(graph.dependenciesOf(moduleId)).toMatchSnapshot();
    });
  });

  describe('inverseDependenciesOf', () => {
    let moduleId: ModuleId;

    beforeAll(() => {
      moduleId = graph.getModuleId(TEST_MODULE)!;
    });

    it('should match snapshot', () => {
      expect(graph.inverseDependenciesOf(moduleId)).toMatchSnapshot();
    });
  });

  describe('helpers', () => {
    describe('isExternal', () => {
      let moduleId: ModuleId;
      let externalModuleId: ModuleId;

      beforeAll(() => {
        moduleId = graph.getModuleId(TEST_MODULE)!;
        externalModuleId = graph.getModuleId(EXTERNAL_MODULE)!;
      });

      it('should returns `false` if the module is not external', () => {
        expect(helpers.isExternal(graph.getModule(moduleId))).toEqual(false);
      });

      it('should returns `true` if the module is external', () => {
        expect(helpers.isExternal(graph.getModule(externalModuleId))).toEqual(
          true,
        );
      });
    });
  });
});
