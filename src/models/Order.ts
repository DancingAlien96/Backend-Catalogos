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
import { Customer } from './Customer';
import { OrderItem } from './OrderItem';

@Table({
  tableName: 'orders',
  timestamps: true,
})
export class Order extends Model {
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

  @ForeignKey(() => Customer)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  customer_id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
  })
  order_number!: string;

  @Column({
    type: DataType.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 0,
  })
  delivery_cost!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  total!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  delivery_address!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  delivery_notes!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  payment_method!: string;

  @Column({
    type: DataType.ENUM('pending', 'paid', 'refunded'),
    defaultValue: 'pending',
  })
  payment_status!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relaciones
  @BelongsTo(() => Store)
  store!: Store;

  @BelongsTo(() => Customer)
  customer!: Customer;

  @HasMany(() => OrderItem)
  items!: OrderItem[];
}
