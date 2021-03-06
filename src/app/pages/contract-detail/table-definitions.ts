import { Column, Template } from '@tezblock/components/tezblock-table/tezblock-table.component'

export const columns: {
  [key: string]: (options: {
    pageId: string
    showFiatValue: boolean
    symbol: string
  }) => Column[]
} = {
  transfers: (options: {
    pageId: string
    showFiatValue: boolean
    symbol: string
  }) => [
    {
      name: 'From',
      field: 'from',
      width: '1',
      template: Template.address,
      data: (item: any) => ({ data: item.from, options: { showFullAddress: false, pageId: options.pageId } })
    },
    {
      field: '',
      width: '1',
      template: Template.symbol
    },
    {
      name: 'To',
      field: 'to',
      width: '1',
      template: Template.address,
      data: (item: any) => ({ data: item.to, options: { showFullAddress: false, pageId: options.pageId } })
    },
    {
      name: 'Amount',
      field: 'amount',
      template: Template.amount,
      data: (item: any) => ({
        data: item.amount,
        options: {
          showFiatValue: options.showFiatValue,
          symbol: options.symbol
        }
      }),
      sortable: false
    },
    {
      name: 'Fee',
      field: 'fee',
      template: Template.amount,
      data: (item: any) => ({ data: item.fee, options: { showFiatValue: false, digitsInfo: '1.2-8'} }),
      sortable: false
    },
    {
      name: 'Age',
      field: 'timestamp',
      template: Template.timestamp,
      data: (item: any) => ({ data: item.timestamp }),
      sortable: true
    },
    {
      name: 'Block',
      field: 'block_level',
      template: Template.block,
      sortable: true
    },
    {
      name: 'Tx Hash',
      field: 'operation_group_hash',
      template: Template.hash
    }
  ],
  other: (options: {
    pageId: string
    showFiatValue: boolean
    symbol: string
  }) => [
    {
      name: 'From',
      field: 'source',
      width: '1',
      template: Template.address,
      data: (item: any) => ({ data: item.source, options: { showFullAddress: false, pageId: options.pageId } })
    },
    {
      field: '',
      width: '1',
      template: Template.symbol
    },
    {
      name: 'To',
      field: 'destination',
      width: '1',
      template: Template.address,
      data: (item: any) => ({ data: item.destination, options: { showFullAddress: false, pageId: options.pageId } })
    },
    {
      name: 'Amount',
      field: 'amount',
      template: Template.amount,
      data: (item: any) => ({
        data: item.amount,
        options: {
          showFiatValue: options.showFiatValue,
          symbol: options.symbol
        }
      }),
      sortable: true
    },
    {
      name: 'Fee',
      field: 'fee',
      template: Template.amount,
      data: (item: any) => ({ data: item.fee, options: { showFiatValue: false, digitsInfo: '1.2-8' } }),
      sortable: true
    },
    {
      name: 'Age',
      field: 'timestamp',
      template: Template.timestamp,
      sortable: true
    },
    {
      name: 'Entry Point',
      field: 'entrypoint'
    },
    {
      name: 'Block',
      field: 'block_level',
      template: Template.block,
      sortable: true
    },
    {
      name: 'Tx Hash',
      field: 'operation_group_hash',
      template: Template.hash
    }
  ],
  tokenHolders: (options: {
    pageId: string
    showFiatValue: boolean
    symbol: string
  }) => [
    {
      name: 'Account',
      field: 'address',
      template: Template.address,
      data: (item: any) => ({ data: item.address, options: { showFullAddress: false, pageId: options.pageId } })
    },
    {
      name: 'Token Balance',
      field: 'amount',
      template: Template.amount,
      data: (item: any) => ({
        data: item.amount,
        options: {
          showFiatValue: options.showFiatValue,
          symbol: options.symbol
        }
      })
    }
  ]
}
