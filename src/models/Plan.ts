import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import { Store } from './Store';

@Table({
  tableName: 'plans',
  timestamps: true,
})
export class Plan extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  slug!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  price!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  product_limit!: number | null;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  features!: any;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  @HasMany(() => Store)
  stores!: Store[];
}
