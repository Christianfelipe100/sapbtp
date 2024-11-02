@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Libros'
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType:{
    serviceQuality: #X,
    sizeCategory: #S,
    dataClass: #MIXED
}

@Metadata.allowExtensions: true

define view entity ZC_LIB_CJF
  as select from    ztb_lib_cjf     as Libros
    inner join      ztb_categ_cjf   as Categorias on Libros.bi_categ = Categorias.bi_categ
    left outer join ZC_CLNT_LIB_CJF as Ventas     on Libros.id_libro = Ventas.IdLibro
  association [0..*] to ZC_CLIENTES_CJF as _Cliente on $projection.IdLibro = _Cliente.IDLIBRO
{
  key Libros.id_libro        as IdLibro,
      Libros.titulo          as Titulo,
      Libros.bi_categ        as Categoria,
      Libros.autor           as Autor,
      Libros.editorial       as Editorial,
      Libros.idioma          as Idioma,
      Libros. paginas        as Paginas,
      @Semantics.amount.currencyCode: 'Moneda'
      Libros.precio          as Precio,
      Libros.moneda          as Moneda,

      case
      when Ventas.Ventas < 1 then 0
      when Ventas.Ventas  = 1 then 1
      when Ventas.Ventas  = 2 then 2
      when Ventas.Ventas  > 2 then 3
      else 0
      end as Ventas,

      Categorias.descripcion as description,
      Libros.formato         as Formato,
      Libros.url             as Imagen,
      _Cliente
}
