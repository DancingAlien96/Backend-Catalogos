import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Order } from './Order';
import { Product } from './Product';

@Table({
  tableName: 'order_items',
  timestamps: true,
})
export class OrderItem extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @ForeignKey(() => Order)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  order_id!: number;

  @ForeignKey(() => Product)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  product_id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  product_name!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  variant_info!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quantity!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  unit_price!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  subtotal!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;

  // Relaciones
  @BelongsTo(() => Order)
  order!: Order;

  @BelongsTo(() => Product)
  product!: Product;
}
