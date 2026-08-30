import { DataSource, DataSourceOptions } from 'typeorm';
import { Env } from '../common/config/env';

/** Standalone DataSource used by the TypeORM CLI for migrations. */
export default new DataSource(Env.db.typeOrmConf as DataSourceOptions);
