import { Component, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Store } from '@ngrx/store'
import { from, Observable, combineLatest } from 'rxjs'
import { map, filter, switchMap } from 'rxjs/operators'
import { animate, state, style, transition, trigger } from '@angular/animations'
import { TezosNetwork } from 'airgap-coin-lib/dist/protocols/tezos/TezosProtocol'
import { Actions, ofType } from '@ngrx/effects'
import * as moment from 'moment'

import { ChainNetworkService } from '@tezblock/services/chain-network/chain-network.service'
import { BaseComponent } from '@tezblock/components/base.component'
import * as fromRoot from '@tezblock/reducers'
import * as actions from './actions'
import * as appActions from '@tezblock/app.actions'
import { TokenContract, Social, SocialType, ContractOperation, hasTokenHolders } from '@tezblock/domain/contract'
import { isConvertableToUSD } from '@tezblock/domain/airgap'
import { AccountService } from '../../services/account/account.service'
import { isNil, negate } from 'lodash'
import { AliasPipe } from '@tezblock/pipes/alias/alias.pipe'
import { columns } from './table-definitions'
import { Count, Tab, updateTabCounts } from '@tezblock/domain/tab'
import { OrderBy } from '@tezblock/services/base.service'
import { IconPipe } from 'src/app/pipes/icon/icon.pipe'
import { getRefresh } from '@tezblock/domain/synchronization'

const last24 = (transaction: ContractOperation): boolean => {
  const hoursAgo = moment().diff(moment(transaction.timestamp), 'hours', true)

  return hoursAgo <= 24
}

@Component({
  selector: 'app-contract-detail',
  templateUrl: './contract-detail.component.html',
  styleUrls: ['./contract-detail.component.scss'],
  animations: [
    trigger('changeBtnColor', [
      state(
        'copyTick',
        style({
          backgroundColor: 'lightgreen',
          backgroundImage: ''
        })
      ),
      transition('copyGrey =>copyTick', [animate(250, style({ transform: 'rotateY(360deg) scale(1.3)', backgroundColor: 'lightgreen' }))])
    ])
  ]
})
export class ContractDetailComponent extends BaseComponent implements OnInit {
  address$: Observable<string>
  contract$: Observable<TokenContract>
  website$: Observable<string>
  twitter$: Observable<string>
  telegram$: Observable<string>
  medium$: Observable<string>
  github$: Observable<string>
  copyToClipboardState$: Observable<string>
  revealed$: Observable<string>
  hasAlias$: Observable<boolean>
  loading$: Observable<boolean>
  transactions$: Observable<any[]>
  orderBy$: Observable<OrderBy>
  showLoadMore$: Observable<boolean>
  current: string = 'copyGrey'
  manager$: Observable<string>
  showFiatValue$: Observable<boolean>
  transactions24hCount$: Observable<number>
  transactions24hVolume$: Observable<number>

  tabs: Tab[] = [
    {
      title: 'Transfers',
      active: true,
      kind: actions.OperationTab.transfers,
      count: undefined,
      icon: this.iconPipe.transform('exchangeAlt'),
      columns: undefined,
      disabled: function() {
        return !this.count
      }
    },
    {
      title: 'Other Calls',
      active: false,
      kind: actions.OperationTab.other,
      count: undefined,
      icon: this.iconPipe.transform('link'),
      columns: undefined,
      disabled: function() {
        return !this.count
      }
    }
  ]

  get isMainnet(): boolean {
    return this.chainNetworkService.getNetwork() === TezosNetwork.MAINNET
  }

  constructor(
    private readonly actions$: Actions,
    private readonly accountService: AccountService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly aliasPipe: AliasPipe,
    private readonly chainNetworkService: ChainNetworkService,
    private readonly store$: Store<fromRoot.State>,
    private readonly iconPipe: IconPipe
  ) {
    super()

    this.subscriptions.push(
      this.activatedRoute.paramMap.subscribe(paramMap => {
        const address = paramMap.get('id')

        this.store$.dispatch(actions.reset())
        this.store$.dispatch(actions.loadContract({ address }))

        this.revealed$ = from(this.accountService.getAccountStatus(address))
      })
    )
  }

  ngOnInit() {
    this.address$ = this.store$.select(state => state.contractDetails.address)
    this.contract$ = this.store$.select(state => state.contractDetails.contract)
    this.website$ = this.getSocial(social => social.type === SocialType.website)
    this.twitter$ = this.getSocial(social => social.type === SocialType.twitter)
    this.telegram$ = this.getSocial(social => social.type === SocialType.telegram)
    this.medium$ = this.getSocial(social => social.type === SocialType.medium)
    this.github$ = this.getSocial(social => social.type === SocialType.github)
    this.copyToClipboardState$ = this.store$.select(state => state.contractDetails.copyToClipboardState)
    this.hasAlias$ = this.store$
      .select(state => state.contractDetails.address)
      .pipe(map(address => address && !!this.aliasPipe.transform(address)))
    this.transactions$ = combineLatest(
      this.store$.select(state => state.contractDetails.currentTabKind),
      this.store$.select(fromRoot.contractDetails.transferOperations),
      this.store$.select(state => state.contractDetails.otherOperations.data),
      this.store$.select(state => state.contractDetails.tokenHolders.data)
    ).pipe(
      map(([currentTabKind, transferOperations, otherOperations, tokenHolders]) => {
        if (currentTabKind === actions.OperationTab.transfers) {
          return transferOperations
        }

        if (currentTabKind === actions.OperationTab.other) {
          return otherOperations
        }

        return tokenHolders
      })
    )
    this.loading$ = combineLatest(
      this.store$.select(state => state.contractDetails.transferOperations.loading),
      this.store$.select(state => state.contractDetails.otherOperations.loading)
    ).pipe(map(([transferOperationsLoading, otherOperationsLoading]) => transferOperationsLoading || otherOperationsLoading))
    this.orderBy$ = combineLatest(
      this.store$.select(state => state.contractDetails.currentTabKind),
      this.store$.select(state => state.contractDetails.transferOperations.orderBy),
      this.store$.select(state => state.contractDetails.otherOperations.orderBy)
    ).pipe(
      map(([currentTabKind, transferOrderBy, otherOrderBy]) =>
        currentTabKind === actions.OperationTab.transfers ? transferOrderBy : otherOrderBy
      )
    )
    this.store$.select(state => state.contractDetails.transferOperations.loading)
    this.showLoadMore$ = combineLatest(
      this.transactions$,
      this.store$.select(state => state.contractDetails.transferOperations.pagination)
    ).pipe(
      map(([transferOperations, pagination]) =>
        transferOperations ? transferOperations.length === pagination.currentPage * pagination.selectedSize : true
      )
    )
    this.manager$ = this.store$.select(state => state.contractDetails.manager)
    this.showFiatValue$ = this.contract$.pipe(map(contract => contract && isConvertableToUSD(contract.symbol)))
    this.transactions24hCount$ = this.store$
      .select(state => state.contractDetails.transferOperations.data)
      .pipe(
        filter(negate(isNil)),
        map((transitions: ContractOperation[]) => transitions.filter(last24)),
        map(transitions => transitions.length)
      )
    this.transactions24hVolume$ = this.store$
      .select(state => state.contractDetails.transferOperations.data)
      .pipe(
        filter(negate(isNil)),
        map((transitions: ContractOperation[]) => transitions.filter(last24).map(transition => parseFloat(transition.amount.toString()))),
        map(amounts => amounts.reduce((accumulator, currentItem) => accumulator + currentItem, 0))
      )

    this.subscriptions.push(
      combineLatest(
        this.address$,
        this.contract$,
        combineLatest(
          this.store$.select(state => state.contractDetails.transferOperations.pagination.total),
          this.store$.select(state => state.contractDetails.otherOperations.pagination.total),
          this.store$.select(state => state.contractDetails.tokenHolders.pagination.total)
        ).pipe(
          map(([transferCount, otherCount, tokenHoldersCount]) => [
            { key: actions.OperationTab.transfers, count: transferCount },
            { key: actions.OperationTab.other, count: otherCount },
            { key: actions.OperationTab.tokenHolders, count: tokenHoldersCount }
          ])
        )
      )
        .pipe(filter(([address, contract]) => !!address && !!contract))
        .subscribe(([address, contract, counts]) => this.updateTabs(address, contract, counts)),

      this.contract$
        .pipe(
          filter(contract => contract && ['tzBTC', 'BTC'].includes(contract.symbol)),
          switchMap(() =>
            getRefresh([
              this.actions$.pipe(ofType(appActions.loadExchangeRateSucceeded)),
              this.actions$.pipe(ofType(appActions.loadExchangeRateFailed))
            ])
          )
        )
        .subscribe(() => this.store$.dispatch(appActions.loadExchangeRate({ from: 'BTC', to: 'USD' })))
    )
  }

  showQr() {
    this.store$.dispatch(actions.showQr())
  }

  showTelegramModal() {
    this.store$.dispatch(actions.showTelegramModal())
  }

  copyToClipboard(address: string) {
    this.store$.dispatch(actions.copyAddressToClipboard({ address }))
  }

  loadMore() {
    this.store$.dispatch(actions.loadMore())
  }

  tabSelected(currentTabKind: actions.OperationTab) {
    setTimeout(() => this.store$.dispatch(actions.changeOperationsTab({ currentTabKind })), 0)
  }

  sortBy(orderBy: OrderBy) {
    this.store$.dispatch(actions.sortOperations({ orderBy }))
  }

  private getTokenHoldersTab(options: { pageId: string; showFiatValue: boolean; symbol: string }) {
    return {
      title: 'Token Holders',
      active: false,
      kind: actions.OperationTab.tokenHolders,
      count: undefined,
      icon: this.iconPipe.transform('link'),
      columns: columns.tokenHolders(options),
      disabled: function() {
        return !this.count
      }
    }
  }

  private getSocial(condition: (social: Social) => boolean): Observable<string> {
    return this.store$
      .select(state => state.contractDetails.contract)
      .pipe(
        filter(negate(isNil)),
        map(contract => {
          const match = contract.socials.find(condition)

          return match ? match.url : null
        })
      )
  }

  private updateTabs(pageId: string, contract: TokenContract, counts: Count[]) {
    const showFiatValue = isConvertableToUSD(contract.symbol)
    const options = {
      pageId,
      showFiatValue,
      symbol: contract.symbol
    }
    const customTabs = hasTokenHolders ? [this.getTokenHoldersTab(options)] : []
    const tabs = [
      {
        ...this.tabs[0],
        columns: columns.transfers(options)
      },
      {
        ...this.tabs[1],
        columns: columns.other(options)
      }
    ].concat(customTabs)

    this.tabs = updateTabCounts(tabs, counts)
  }
}
