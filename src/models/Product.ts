import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Store } from './Store';
import { Category } from './Category';
import { OrderItem } from './OrderItem';

@Table({
  tableName: 'products',
  timestamps: true,
})
export class Product extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Store)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  store_id!: number;

  @ForeignKey(() => Category)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  category_id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  sku!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0,
  })
  cost_price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  price!: number;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  variants!: any;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  images!: string[];

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  current_stock!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 5,
  })
  min_stock_alert!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  is_active!: boolean;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relaciones
  @BelongsTo(() => Store)
  store!: Store;

  @BelongsTo(() => Category)
  category!: Category;

  @HasMany(() => OrderItem)
  order_items!: OrderItem[];
}
